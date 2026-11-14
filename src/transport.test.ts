import { describe, expect, it, vi } from 'vitest'
import {
  HEADER_IDEMPOTENCY,
  HEADER_SCHEDULED_AT,
  HEADER_TAG,
  createGroundmailTransport,
  mailDataToSendParams,
} from './transport'
import { Groundmail, GroundmailError } from 'groundmail'

describe('mailDataToSendParams', () => {
  it('maps core fields, tags, idempotency, and schedule', async () => {
    const params = await mailDataToSendParams({
      from: { name: 'Ops', address: 'ops@example.com' },
      to: 'user@example.com',
      cc: ['cc@example.com'],
      bcc: 'bcc@example.com',
      replyTo: 'reply@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
      headers: {
        [HEADER_TAG]: ['campaign=welcome', 'env=prod'],
        [HEADER_IDEMPOTENCY]: 'idem-1',
        [HEADER_SCHEDULED_AT]: '2030-01-01T00:00:00Z',
        'X-Custom-Header': 'keep',
      },
      attachments: [
        {
          filename: 'note.txt',
          contentType: 'text/plain',
          content: 'hello',
        },
      ],
    })

    expect(params).toMatchObject({
      from: 'Ops <ops@example.com>',
      to: 'user@example.com',
      cc: ['cc@example.com'],
      bcc: ['bcc@example.com'],
      replyTo: 'reply@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
      idempotencyKey: 'idem-1',
      scheduledAt: '2030-01-01T00:00:00Z',
      tags: [
        { name: 'campaign', value: 'welcome' },
        { name: 'env', value: 'prod' },
      ],
      headers: { 'x-custom-header': 'keep' },
    })
    expect(params.attachments?.[0]).toMatchObject({
      filename: 'note.txt',
      contentType: 'text/plain',
      content: Buffer.from('hello').toString('base64'),
    })
  })

  it('decodes string attachments with their encoding instead of encoding them twice', async () => {
    const bytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0xfe, 0x0a])
    const params = await mailDataToSendParams({
      from: 'ops@example.com',
      to: 'user@example.com',
      text: 'Hi',
      attachments: [
        { filename: 'docs.txt', content: 'aGVsbG8gd29ybGQh', encoding: 'base64' },
        { filename: 'b64.pdf', content: bytes.toString('base64'), encoding: 'base64' },
        { filename: 'hex.pdf', content: bytes.toString('hex'), encoding: 'hex' },
        { filename: 'plain.txt', content: 'héllo', encoding: 'utf-8' },
        { filename: 'none.txt', content: 'héllo' },
        { filename: 'buffer.pdf', content: bytes, encoding: 'base64' },
      ],
    })
    const decoded = (params.attachments ?? []).map((a) => Buffer.from(String(a.content), 'base64'))
    expect(decoded[0].toString()).toBe('hello world!')
    expect(decoded[1].equals(bytes)).toBe(true)
    expect(decoded[2].equals(bytes)).toBe(true)
    expect(decoded[3].toString()).toBe('héllo')
    expect(decoded[4].toString()).toBe('héllo')
    expect(decoded[5].equals(bytes)).toBe(true)
  })

  it('rejects an attachment encoding it cannot decode', async () => {
    await expect(
      mailDataToSendParams({
        from: 'ops@example.com',
        to: 'user@example.com',
        text: 'Hi',
        attachments: [{ filename: 'a.bin', content: 'abc', encoding: 'rot13' }],
      }),
    ).rejects.toThrow(/Unsupported attachment encoding/)
  })

  it('requires from, to, and body', async () => {
    await expect(mailDataToSendParams({ to: 'a@example.com', html: '<p>x</p>' })).rejects.toThrow(
      /From/,
    )
  })
})

describe('createGroundmailTransport', () => {
  it('sends via Groundmail client', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'msg_1', status: 'queued' })
    const client = {
      emails: { send },
    } as unknown as Groundmail

    const transport = createGroundmailTransport({ apiKey: 'gm_test', client })
    const mail = {
      data: {
        from: 'ops@example.com',
        to: 'user@example.com',
        subject: 'Hi',
        html: '<p>Hi</p>',
      },
      message: {
        getEnvelope: () => ({ from: 'ops@example.com', to: ['user@example.com'] }),
      },
    }

    const info = await new Promise<{ messageId: string }>((resolve, reject) => {
      transport.send(mail as never, (err, result) => {
        if (err) reject(err)
        else resolve(result as { messageId: string })
      })
    })

    expect(info.messageId).toBe('msg_1')
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'ops@example.com',
        to: 'user@example.com',
        subject: 'Hi',
        html: '<p>Hi</p>',
      }),
    )
  })

  it('delivers API errors to the Nodemailer callback', async () => {
    const apiError = new GroundmailError('Invalid API key', 401)
    const client = {
      emails: { send: vi.fn().mockRejectedValue(apiError) },
    } as unknown as Groundmail

    const transport = createGroundmailTransport({ apiKey: 'gm_test', client })
    const mail = {
      data: {
        from: 'ops@example.com',
        to: 'user@example.com',
        html: '<p>Hi</p>',
      },
      message: {
        getEnvelope: () => ({ from: 'ops@example.com', to: ['user@example.com'] }),
      },
    }

    const err = await new Promise<Error>((resolve, reject) => {
      transport.send(mail as never, (callbackErr) => {
        if (callbackErr) resolve(callbackErr)
        else reject(new Error('expected callback error'))
      })
    })

    expect(err).toBe(apiError)
    expect(err).toBeInstanceOf(GroundmailError)
  })

  it('delivers mapping errors to the Nodemailer callback', async () => {
    const transport = createGroundmailTransport({
      apiKey: 'gm_test',
      client: { emails: { send: vi.fn() } } as unknown as Groundmail,
    })
    const mail = {
      data: {
        to: 'user@example.com',
        html: '<p>Hi</p>',
      },
      message: {
        getEnvelope: () => ({ from: '', to: ['user@example.com'] }),
      },
    }

    const err = await new Promise<Error>((resolve, reject) => {
      transport.send(mail as never, (callbackErr) => {
        if (callbackErr) resolve(callbackErr)
        else reject(new Error('expected callback error'))
      })
    })

    expect(err.message).toMatch(/From/)
  })
})
