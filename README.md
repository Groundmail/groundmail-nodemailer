# groundmail-nodemailer

**[Nodemailer](https://nodemailer.com) transport for [Groundmail](https://groundmail.dev)** — keep `transporter.sendMail(...)` and deliver over the Groundmail HTTP API (not SMTP).

This repository is the **source of truth** for the transport implementation. Issues and PRs belong here. The HTTP client lives in [`groundmail`](https://www.npmjs.com/package/groundmail).

Works anywhere Nodemailer is accepted: Express apps, Payload, Auth.js email, Strapi, Ghost, workers, and custom stacks.

## Install

```bash
npm install groundmail-nodemailer groundmail nodemailer
```

```bash
GROUNDMAIL_API_KEY=gm_your_key_here
```

## Usage

```ts
import nodemailer from 'nodemailer'
import { createGroundmailTransport } from 'groundmail-nodemailer'

const transporter = nodemailer.createTransport(
  createGroundmailTransport({
    apiKey: process.env.GROUNDMAIL_API_KEY!,
  }),
)

await transporter.sendMail({
  from: 'ops@yourdomain.com',
  to: 'user@example.com',
  subject: 'Your receipt',
  html: '<p>Thanks for your purchase.</p>',
  headers: {
    'X-Groundmail-Tag': 'campaign=welcome',
    'X-Groundmail-Idempotency-Key': 'receipt-123',
  },
})
```

The same transport is also available as `groundmail/nodemailer` (re-export).

## Docs

https://docs.groundmail.dev/frameworks/node

## License

MIT
