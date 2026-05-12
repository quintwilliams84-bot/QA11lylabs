'use strict';

const fs = require('fs');
const path = require('path');

function slugify(value) {
  return String(value || 'prospect')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'prospect';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function copyFile(source, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
  fs.chmodSync(dest, 0o644);
}

function buildEmailPackage(reportPath, options = {}) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (!report.ok) throw new Error(`Risk teaser report is not ok: ${reportPath}`);

  const publicRoot = options.publicRoot || '/var/www/qa11ylabs/evidence';
  const publicBaseUrl = (options.publicBaseUrl || 'https://qa11ylabs.com/evidence').replace(/\/$/, '');
  const runSlug = options.runSlug || `${slugify(report.companyName)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const outDir = path.join(publicRoot, runSlug);
  const webBase = `${publicBaseUrl}/${runSlug}`;

  const screenshotName = 'evidence.png';
  const pdfName = 'executive-risk-teaser.pdf';
  const htmlName = 'executive-risk-teaser.html';
  const jsonName = 'risk-teaser-report.json';
  copyFile(report.files.screenshotPath, path.join(outDir, screenshotName));
  copyFile(report.files.pdfPath, path.join(outDir, pdfName));
  copyFile(report.files.htmlPath, path.join(outDir, htmlName));
  copyFile(report.files.jsonPath, path.join(outDir, jsonName));

  const imageUrl = `${webBase}/${screenshotName}`;
  const pdfUrl = `${webBase}/${pdfName}`;
  const htmlUrl = `${webBase}/${htmlName}`;
  const company = report.companyName;
  const issue = report.selectedIssue;
  const subject = options.subject || `Accessibility evidence for ${company}`;

  const text = `Hi ${options.greetingName || `${company} team`},

I put together a short visual evidence snapshot for one accessibility issue I found on ${company}'s website.

The selected issue is ${issue.ruleId} (${issue.impact}), mapped to ${issue.wcagMapping}. In plain English, this can create friction for customers using screen readers, keyboard navigation, zoom, or stronger visual contrast.

You can view the evidence image here:
${imageUrl}

And the one-page executive teaser here:
${pdfUrl}

This is not a full audit or legal advice. It is a quick risk signal showing why a guided remediation pass would be useful.

Would you like me to send over the next 2-3 fixes I would prioritize?

Best,
Quintin Williams
Founder and Lead Accessibility Consultant
QA11Y Labs
https://qa11ylabs.com
Schedule: https://qa11ylabs.com/schedule.html

If this is not relevant, reply "no thanks" and I will not follow up.`;

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
  <div style="max-width:680px;margin:0 auto;padding:24px;">
    <div style="border-top:5px solid #0057B8;padding-top:16px;margin-bottom:18px;">
      <div style="font-size:22px;font-weight:900;color:#0057B8;letter-spacing:.04em;">QA11Y LABS</div>
      <div style="font-size:13px;color:#475569;">Accessibility evidence for revenue, risk, and remediation decisions</div>
    </div>
    <p>Hi ${escapeHtml(options.greetingName || `${company} team`)},</p>
    <p>I put together a short visual evidence snapshot for one accessibility issue I found on ${escapeHtml(company)}'s website.</p>
    <div style="background:#fff1f2;border-left:6px solid #D32F2F;border-radius:10px;padding:14px;margin:16px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748B;font-weight:800;">Selected issue</div>
      <div style="font-size:16px;margin-top:4px;"><strong>${escapeHtml(issue.ruleId)}</strong> (${escapeHtml(issue.impact)})</div>
      <div style="font-size:14px;margin-top:8px;">${escapeHtml(issue.wcagMapping)}</div>
    </div>
    <p>In plain English, this can create friction for customers using screen readers, keyboard navigation, zoom, or stronger visual contrast.</p>
    <a href="${escapeHtml(pdfUrl)}" style="display:block;text-decoration:none;color:#111827;">
      <img src="${escapeHtml(imageUrl)}" alt="QA11Y Labs highlighted accessibility evidence for ${escapeHtml(company)}" style="width:100%;max-width:640px;border:3px solid #D32F2F;border-radius:12px;display:block;margin:18px 0;">
    </a>
    <p>If images are blocked in your email client, you can open the one-page evidence teaser here: <a href="${escapeHtml(pdfUrl)}">${escapeHtml(pdfUrl)}</a></p>
    <p>This is not a full audit or legal advice. It is a quick risk signal showing why a guided remediation pass would be useful.</p>
    <p>Would you like me to send over the next 2-3 fixes I would prioritize?</p>
    <p>Best,<br>
    Quintin Williams<br>
    Founder and Lead Accessibility Consultant<br>
    QA11Y Labs<br>
    <a href="https://qa11ylabs.com">https://qa11ylabs.com</a><br>
    Schedule: <a href="https://qa11ylabs.com/schedule.html">https://qa11ylabs.com/schedule.html</a></p>
    <p style="font-size:12px;color:#64748B;">If this is not relevant, reply "no thanks" and I will not follow up.</p>
  </div>
</body>
</html>`;

  const packageDir = options.packageDir || path.join(path.dirname(reportPath), 'email-package');
  fs.mkdirSync(packageDir, { recursive: true });
  const textPath = path.join(packageDir, 'email.txt');
  const htmlPath = path.join(packageDir, 'email.html');
  const metaPath = path.join(packageDir, 'email-package.json');
  fs.writeFileSync(textPath, text);
  fs.writeFileSync(htmlPath, html);
  const meta = {
    companyName: company,
    subject,
    textPath,
    htmlPath,
    publicDir: outDir,
    imageUrl,
    pdfUrl,
    htmlUrl,
    reportPath,
    attachmentPdf: path.join(outDir, pdfName),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  return meta;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--report' && value) {
      args.report = value;
      i += 1;
    } else if (key === '--run-slug' && value) {
      args.runSlug = value;
      i += 1;
    } else if (key === '--subject' && value) {
      args.subject = value;
      i += 1;
    } else if (key === '--greeting-name' && value) {
      args.greetingName = value;
      i += 1;
    } else if (key === '--public-root' && value) {
      args.publicRoot = value;
      i += 1;
    } else if (key === '--public-base-url' && value) {
      args.publicBaseUrl = value;
      i += 1;
    } else if (key === '--package-dir' && value) {
      args.packageDir = value;
      i += 1;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
QA11Y Risk Teaser Email Packager

Usage:
  node risk-teaser-email-pack.js --report risk-teaser.json --run-slug ruby-river-20260502
`);
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (args.help || !args.report) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  try {
    const meta = buildEmailPackage(args.report, args);
    console.log(JSON.stringify(meta, null, 2));
  } catch (error) {
    console.error(error.stack || error);
    process.exit(1);
  }
}

module.exports = { buildEmailPackage };
