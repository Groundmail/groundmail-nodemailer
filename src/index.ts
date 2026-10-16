/**
 * Nodemailer transport for Groundmail.
 *
 * Source of truth for the transport lives in this package (public GitHub repo
 * Groundmail/groundmail-nodemailer). The core `groundmail` SDK re-exports
 * these symbols as `groundmail/nodemailer` for backward compatibility.
 */
export {
  createGroundmailTransport,
  groundmailTransport,
  mailDataToSendParams,
  HEADER_IDEMPOTENCY,
  HEADER_SCHEDULED_AT,
  HEADER_TAG,
  type GroundmailTransportOptions,
} from './transport'
