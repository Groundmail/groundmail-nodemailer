import type { Transport, TransportOptions } from 'nodemailer'
import type MailMessage from 'nodemailer/lib/mailer/mail-message.js'
import type { Address as NodemailerAddress } from 'nodemailer/lib/mailer/index.js'
import {
  Groundmail,
  DEFAULT_API_BASE_URL,
  GroundmailError,
  type SendEmailParams,
} from 'groundmail'

export const HEADER_IDEMPOTENCY = 'X-Groundmail-Idempotency-Key'
export const HEADER_SCHEDULED_AT = 'X-Groundmail-Scheduled-At'
export const HEADER_TAG = 'X-Groundmail-Tag'

const RESERVED_HEADERS = new Set([
  'from',
  'to',
  'cc',
  'bcc',
  'reply-to',
  'subject',
  'content-type',
  'mime-version',
  'date',
  'message-id',
  'x-groundmail-idempotency-key',
  'x-groundmail-scheduled-at',
  'x-groundmail-tag',
  'idempotency-key',
])

export type GroundmailTransportOptions = {
  apiKey: string
  baseUrl?: string
  /** Prebuilt client (tests / advanced wiring). */
  client?: Groundmail
}

type AddressLike = string | NodemailerAddress | Array<string | NodemailerAddress> | undefined

function formatOne(addr: string | NodemailerAddress): string {
  if (typeof addr === 'string') return addr.trim()
  const email = addr.address?.trim()
  if (!email) return ''
  const name = addr.name?.trim()
  return name ? `${name} <${email}>` : email
}

function formatAddresses(value: AddressLike): string[] {
  if (value == null) return []
  const list = Array.isArray(value) ? value : [value]
  return list.map(formatOne).filter(Boolean)
}

function headerMap(headers: MailMessage['data']['headers']): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!headers) return out

  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (!entry || typeof entry !== 'object') continue
      const key = String((entry as { key?: string }).key || '').toLowerCase()
      const value = String((entry as { value?: string }).value ?? '')
      if (!key) continue
      ;(out[key] ??= []).push(value)
    }
    return out
  }

  for (const [key, raw] of Object.entries(headers)) {
    const k = key.toLowerCase()
    if (Array.isArray(raw)) {
      out[k] = raw.map(String)
    } else if (raw != null) {
      out[k] = [String(raw)]
    }
  }
  return out
}

async function attachmentContentToBase64(content: unknown): Promise<string> {
  if (content == null) {
    throw new Error('Attachment is missing content')
  }
  if (typeof content === 'string') {
    return Buffer.from(content).toString('base64')
  }
  if (Buffer.isBuffer(content)) {
    return content.toString('base64')
  }
  if (content instanceof Uint8Array) {
    return Buffer.from(content).toString('base64')
  }
  throw new Error('Unsupported attachment content type')
}

export async function mailDataToSendParams(data: MailMessage['data']): Promise<SendEmailParams> {
  const fromList = formatAddresses(data.from as AddressLike)
  if (!fromList.length) throw new Error('Email is missing a From address.')
  const to = formatAddresses(data.to as AddressLike)
  if (!to.length) throw new Error('Email is missing a To recipient.')

  const html = typeof data.html === 'string' ? data.html : undefined
  const text = typeof data.text === 'string' ? data.text : undefined
  if (!html && !text) {
    throw new Error('Email must include html or text content.')
  }

  const headers = headerMap(data.headers)
  const params: SendEmailParams = {
    from: fromList[0],
    to: to.length === 1 ? to[0] : to,
  }

  if (typeof data.subject === 'string' && data.subject) params.subject = data.subject
  if (html) params.html = html
  if (text) params.text = text

  const reply = formatAddresses(data.replyTo as AddressLike)
  if (reply.length) params.replyTo = reply.length === 1 ? reply[0] : reply

  const cc = formatAddresses(data.cc as AddressLike)
  if (cc.length) params.cc = cc
  const bcc = formatAddresses(data.bcc as AddressLike)
  if (bcc.length) params.bcc = bcc

  if (data.attachments?.length) {
    params.attachments = await Promise.all(
      data.attachments.map(async (att) => {
        const filename = att.filename || att.cid || 'attachment'
        const contentType = att.contentType || 'application/octet-stream'
        if (att.path || typeof att.raw === 'string') {
          throw new Error(
            `Attachment "${filename}" must include inline content (Buffer/string). path/raw are not supported.`,
          )
        }
        return {
          filename: String(filename),
          contentType,
          content: await attachmentContentToBase64(att.content),
          ...(att.cid ? { contentId: String(att.cid) } : {}),
        }
      }),
    )
  }

  const tagValues = headers['x-groundmail-tag'] ?? []
  if (tagValues.length) {
    params.tags = tagValues.flatMap((raw) => {
      const trimmed = raw.trim()
      if (!trimmed) return []
      if (trimmed.includes('=')) {
        const [name, value] = trimmed.split('=', 2)
        if (name.trim() && value.trim()) return [{ name: name.trim(), value: value.trim() }]
        return []
      }
      return [{ name: 'tag', value: trimmed }]
    })
  }

  const forward: Record<string, string> = {}
  for (const [key, values] of Object.entries(headers)) {
    if (RESERVED_HEADERS.has(key)) continue
    if (key.startsWith('content-')) continue
    const value = values[values.length - 1]?.trim()
    if (value) forward[key] = value
  }
  if (Object.keys(forward).length) params.headers = forward

  const idem =
    headers['x-groundmail-idempotency-key']?.[0]?.trim() ||
    headers['idempotency-key']?.[0]?.trim()
  if (idem) params.idempotencyKey = idem

  const scheduled = headers['x-groundmail-scheduled-at']?.[0]?.trim()
  if (scheduled) params.scheduledAt = scheduled

  return params
}

/** Nodemailer transport that delivers via Groundmail HTTP API. */
export function createGroundmailTransport(
  options: GroundmailTransportOptions,
): Transport & TransportOptions {
  const client =
    options.client ??
    new Groundmail(options.apiKey, {
      baseUrl: options.baseUrl ?? DEFAULT_API_BASE_URL,
    })

  return {
    name: 'Groundmail',
    version: '0.14.0',
    send(mail, callback) {
      // Settle via .then so every rejection reaches the Nodemailer callback
      // (avoids a floating promise from void async IIFE).
      ;(async () => {
        const params = await mailDataToSendParams(mail.data)
        const result = await client.emails.send(params)
        const envelope = mail.message.getEnvelope()
        return {
          envelope,
          messageId: result.id,
          accepted: envelope.to,
          rejected: [] as string[],
          pending: [] as string[],
          response: `${result.status} ${result.id}`,
        }
      })().then(
        (info) => {
          callback(null, info)
        },
        (err: unknown) => {
          const error =
            err instanceof GroundmailError
              ? err
              : err instanceof Error
                ? err
                : new Error(String(err))
          callback(error, undefined as never)
        },
      )
    },
  }
}

/** Alias matching common `createTransport(transport(...))` naming. */
export const groundmailTransport = createGroundmailTransport
