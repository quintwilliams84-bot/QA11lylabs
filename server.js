/**
 * QA11Y Labs — Free Accessibility Scan Backend
 * Stack: Express + Playwright + axe-core + PDFKit + AgentMail
 *
 * GET  /api/scan-stream?url=...&email=...  (SSE live progress)
 * POST /api/scan  { url, email }            (legacy fallback)
 *
 * Scan logic lives in scan_server_patch.js — see registerScanRoutes.
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const fs         = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');

// Scan routes (SSE stream + legacy POST + PDF + email + Telegram)
const { registerScanRoutes } = require('./scan_server_patch');

const app  = express();
const PORT = process.env.PORT || 3001;
const execFileAsync = promisify(execFile);

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch (err) {
    console.warn('[server] Could not load env file:', err.message);
  }
}

loadEnvFile('/root/.env');

// ─── AgentMail config ─────────────────────────────────────────────────────
const AGENTMAIL_INBOX   = (process.env.AGENTMAIL_INBOX || 'qa11ylabsagent@agentmail.to').toLowerCase();
const QA11Y_PYTHON      = process.env.QA11Y_PYTHON || '/root/qa11y-venv/bin/python';
const AGENTMAIL_SENDER  = process.env.AGENTMAIL_SENDER || '/root/agentmail_send.py';
const BUSINESS_NOTIFY_EMAIL = process.env.QA11Y_BUSINESS_NOTIFY_EMAIL || 'quintin@qa11ylabs.com';
const INTERNAL_NOTIFY_FALLBACK_EMAIL = process.env.QA11Y_INTERNAL_NOTIFY_FALLBACK_EMAIL || 'quintwilliams84@gmail.com';


// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── AgentMail via verified Python sender ─────────────────────────────────
async function sendAgentMail({ to, subject, text, html, replyTo, attachments = [] }) {
  const args = [
    AGENTMAIL_SENDER,
    '--to', to,
    '--subject', subject,
    '--text', text || '',
  ];
  if (html) args.push('--html', html);
  if (replyTo) args.push('--reply-to', replyTo);
  for (const attachment of attachments) args.push('--attachment', attachment);

  const { stdout, stderr } = await execFileAsync(QA11Y_PYTHON, args, {
    timeout: 45000,
    maxBuffer: 1024 * 1024,
  });
  const output = `${stdout || ''}${stderr || ''}`.trim();
  const match = output.match(/message_id:\s*<?([^>\s]+)>?/i);
  if (!match) {
    throw new Error(`AgentMail sender did not return a message_id. Output: ${output.slice(0, 240)}`);
  }
  return { messageId: match[1], output };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Scan routes (SSE stream + legacy POST) ────────────────────────────────
registerScanRoutes(app, { sendAgentMail }, AGENTMAIL_INBOX);

// ─── Contact form submission ───────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const {
    name,
    email,
    organization,
    service,
    subject: submittedSubject,
    topic,
    preferred_time,
    message,
    budget
  } = req.body || {};

  const isScheduleRequest = Boolean(preferred_time || topic || String(submittedSubject || '').toLowerCase().includes('consultation'));
  if (!name || !email || (!message && !isScheduleRequest)) {
    return res.status(400).json({ error: isScheduleRequest ? 'Name and email are required.' : 'Name, email, and message are required.' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    organization: escapeHtml(organization),
    service: escapeHtml(service),
    submittedSubject: escapeHtml(submittedSubject),
    topic: escapeHtml(topic),
    preferredTime: escapeHtml(preferred_time),
    budget: escapeHtml(budget),
    message: escapeHtml(message || ''),
  };
  const inquiryType = submittedSubject || service || topic || (isScheduleRequest ? 'Consultation request' : 'General inquiry');
  const orgRow    = organization     ? `<tr><td style="padding:8px 0;color:#5a5f6e;width:160px;">Organization</td><td style="padding:8px 0;color:#1a1d26;">${safe.organization}</td></tr>` : '';
  const typeRow   = inquiryType      ? `<tr><td style="padding:8px 0;color:#5a5f6e;">Inquiry type</td><td style="padding:8px 0;color:#1a1d26;">${escapeHtml(inquiryType)}</td></tr>` : '';
  const topicRow  = topic            ? `<tr><td style="padding:8px 0;color:#5a5f6e;">Topic</td><td style="padding:8px 0;color:#1a1d26;">${safe.topic}</td></tr>` : '';
  const timeRow   = preferred_time   ? `<tr><td style="padding:8px 0;color:#5a5f6e;">Preferred time</td><td style="padding:8px 0;color:#1a1d26;">${safe.preferredTime}</td></tr>` : '';
  const svcRow    = service          ? `<tr><td style="padding:8px 0;color:#5a5f6e;">Service</td><td style="padding:8px 0;color:#1a1d26;">${safe.service}</td></tr>` : '';
  const budgetRow = budget           ? `<tr><td style="padding:8px 0;color:#5a5f6e;">Budget</td><td style="padding:8px 0;color:#1a1d26;">${safe.budget}</td></tr>` : '';
  const msgHtml   = (safe.message || 'No additional message provided.').replace(/\n/g, '<br>');

  const html = `<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f4f5f7;border-radius:8px;">
  <div style="background:#0B0C10;padding:24px;border-radius:8px;margin-bottom:24px;">
    <span style="font-size:20px;font-weight:700;"><span style="color:#fff;">QA11Y</span><span style="color:#66FCF1;">Labs</span></span>
    <span style="color:#9AA0B0;font-size:13px;margin-left:12px;">${isScheduleRequest ? 'New Consultation Request' : 'New Client Inquiry'}</span>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#5a5f6e;width:160px;">Name</td><td style="padding:8px 0;font-weight:600;">${safe.name}</td></tr>
    <tr><td style="padding:8px 0;color:#5a5f6e;">Email</td><td style="padding:8px 0;"><a href="mailto:${safe.email}" style="color:#007a76;">${safe.email}</a></td></tr>
    ${orgRow}${typeRow}${topicRow}${timeRow}${svcRow}${budgetRow}
  </table>
  <div style="background:#fff;border:1px solid #d0d4de;border-radius:8px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 8px;font-size:13px;color:#5a5f6e;font-weight:600;">Message</p>
    <p style="margin:0;font-size:15px;color:#1a1d26;line-height:1.65;">${msgHtml}</p>
  </div>
  <p style="font-size:12px;color:#9aa0b0;text-align:center;">Submitted via ${isScheduleRequest ? 'qa11ylabs.com/schedule' : 'qa11ylabs.com/contact'}</p>
</div>`;

  const orgLine = organization ? ` at ${organization}` : '';
  const text = `${isScheduleRequest ? 'New consultation request' : 'New inquiry'} from ${name} (${email})${orgLine}.\n\nInquiry type: ${inquiryType || 'Not specified'}\nTopic: ${topic || 'Not specified'}\nPreferred time: ${preferred_time || 'Not specified'}\nService: ${service || 'Not specified'}\nBudget: ${budget || 'Not specified'}\n\nMessage:\n${message || 'No additional message provided.'}`;
  const subject = `${isScheduleRequest ? 'New Consultation Request' : 'New Inquiry'} from ${name}${orgLine} | QA11Y Labs`;

  try {
    const result = await sendAgentMail({
      to: BUSINESS_NOTIFY_EMAIL,
      replyTo: email,
      subject,
      html,
      text
    });
    console.log(`[contact] Inquiry from ${email} forwarded to ${BUSINESS_NOTIFY_EMAIL}: ${result.messageId}`);
    return res.json({ success: true, message_id: result.messageId });
  } catch (err) {
    console.error(`[contact] Primary notification failed for ${BUSINESS_NOTIFY_EMAIL}:`, err.message);
    const fallback = String(INTERNAL_NOTIFY_FALLBACK_EMAIL || '').trim();
    if (fallback && fallback.toLowerCase() !== String(BUSINESS_NOTIFY_EMAIL || '').trim().toLowerCase()) {
      try {
        const fallbackResult = await sendAgentMail({
          to: fallback,
          replyTo: email,
          subject: `[Fallback] ${subject}`,
          html,
          text
        });
        console.log(`[contact] Inquiry from ${email} forwarded to internal fallback ${fallback}: ${fallbackResult.messageId}`);
        return res.json({ success: true, message_id: fallbackResult.messageId, fallback: true });
      } catch (fallbackErr) {
        console.error(`[contact] Fallback notification failed for ${fallback}:`, fallbackErr.message);
      }
    }
    return res.status(500).json({ error: 'Failed to send. Please email quintin@qa11ylabs.com directly.' });
  }
});

// ─── Start server ──────────────────────────────────────────────────────────
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error();
    setTimeout(() => {
      server.close();
      server.listen(PORT, '127.0.0.1');
    }, 3000);
  } else {
    console.error('[server] Fatal error:', err.message);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err.message);
  // Don't exit — let PM2 decide
});
