<p align="center">
  <a href="https://groundmail.dev?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://app.groundmail.dev/images/github/readme-logo-dark.png">
      <img alt="Groundmail" src="https://app.groundmail.dev/images/github/readme-logo-light.png" height="44">
    </picture>
  </a>
</p>

<h1 align="center">Groundmail for Nodemailer</h1>

<p align="center">
  A <a href="https://nodemailer.com">Nodemailer</a> transport for the Groundmail transactional email API.<br>
  Keep <code>transporter.sendMail()</code>; deliver over the Groundmail HTTP API instead of SMTP.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/groundmail-nodemailer"><img alt="npm" src="https://img.shields.io/npm/v/groundmail-nodemailer?color=a3461f&label=npm"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-b48f62"></a>
</p>

<p align="center">
  <a href="https://docs.groundmail.dev/frameworks/node?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer">Docs</a> ·
  <a href="https://app.groundmail.dev/signup?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer">Get a free account</a> ·
  <a href="https://groundmail.dev?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer">groundmail.dev</a>
</p>

---

Works anywhere Nodemailer does: Express apps, Payload, Auth.js email, Strapi, Ghost, background workers and custom stacks. Swap the transport and your existing `sendMail` calls keep working.

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

The same transport is also exported from the main SDK as `groundmail/nodemailer`.

## Headers

| Header | Purpose |
|--------|---------|
| `X-Groundmail-Tag` | `name=value` tag (repeatable) |
| `X-Groundmail-Idempotency-Key` | Send once, even when your code retries |

## Contributing

Found a bug or want something added? [Open an issue](https://github.com/Groundmail/groundmail-nodemailer/issues). This code is published here on each release, so we port fixes rather than merging pull requests directly. The HTTP client itself is the [`groundmail`](https://www.npmjs.com/package/groundmail) package.

## Why Groundmail

- **Our own mail servers and IP space.** Your password resets and receipts don't share a pool with bulk marketing senders.
- **Transactional email only.** No newsletters or cold outreach on the platform, which keeps the sending reputation clean.
- **Start free.** Free covers 3,000 emails a month. After that it's pay as you go: $0.70 per 1,000, less as you grow. [Pricing](https://groundmail.dev/pricing/?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer)
- **Built for code and for agents.** REST API, SMTP, SDKs for Node, Python, Go, PHP and Ruby, a CLI, and an MCP server for Claude, ChatGPT and Cursor.

## All Groundmail libraries

| Use | Package |
|-----|---------|
| Node.js / TypeScript | [`groundmail`](https://www.npmjs.com/package/groundmail) on npm |
| Python (Django), Go, Ruby (Rails Action Mailer) | [Groundmail/groundmail-sdks](https://github.com/Groundmail/groundmail-sdks) |
| PHP | [Groundmail/groundmail-php](https://github.com/Groundmail/groundmail-php) |
| Laravel | [Groundmail/groundmail-laravel](https://github.com/Groundmail/groundmail-laravel) |
| Symfony Mailer | [Groundmail/groundmail-symfony-mailer](https://github.com/Groundmail/groundmail-symfony-mailer) |
| Nodemailer | [Groundmail/groundmail-nodemailer](https://github.com/Groundmail/groundmail-nodemailer) |
| NestJS | [Groundmail/nestjs-groundmail](https://github.com/Groundmail/nestjs-groundmail) |
| Strapi | [Groundmail/strapi-provider-email-groundmail](https://github.com/Groundmail/strapi-provider-email-groundmail) |
| Medusa | [Groundmail/medusa-notification-groundmail](https://github.com/Groundmail/medusa-notification-groundmail) |
| AdonisJS | [Groundmail/adonisjs-groundmail](https://github.com/Groundmail/adonisjs-groundmail) |
| Phoenix (Swoosh) | [Groundmail/swoosh_groundmail](https://github.com/Groundmail/swoosh_groundmail) |
| CLI | [`groundmail-cli`](https://www.npmjs.com/package/groundmail-cli) on npm |
| MCP server (Claude, ChatGPT, Cursor) | [Groundmail/groundmail-mcp](https://github.com/Groundmail/groundmail-mcp) |
| Agent skills and Claude Code plugin | [Groundmail/groundmail-skills](https://github.com/Groundmail/groundmail-skills) |
| Email templates (React Email, MJML, HTML) | [Groundmail/email-templates](https://github.com/Groundmail/email-templates) |

[Website](https://groundmail.dev?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer) · [Docs](https://docs.groundmail.dev?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer) · [Pricing](https://groundmail.dev/pricing/?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer) · [Sign up free](https://app.groundmail.dev/signup?utm_source=github&utm_medium=readme&utm_campaign=groundmail-nodemailer)
