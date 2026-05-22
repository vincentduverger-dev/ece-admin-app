import { existsSync } from "node:fs";
import path from "node:path";

import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

import { BRANDING } from "../config/branding";
import { config } from "../config/env";

export type ApplicationMailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendApplicationMailInput = {
  attachments?: ApplicationMailAttachment[];
  to: string;
  subject: string;
  body: string;
};

type SendMailInput = {
  attachments?: Mail.Attachment[];
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SmtpErrorMetadata = {
  name?: string;
  message: string;
  code?: unknown;
  command?: unknown;
  responseCode?: unknown;
  response?: unknown;
};

const INSTITUTIONAL_TEXT_SIGNATURE = `Cordialement,

${BRANDING.schoolName}
Service Inscriptions

📧 ${BRANDING.contactEmail}`;

const appendTextSignature = (value: string): string => {
  return `${value.trimEnd()}\n\n${INSTITUTIONAL_TEXT_SIGNATURE}`;
};

const BRAND_LOGO_CID = "academie-horizon-logo";
const BRAND_LOGO_FILENAME = "logo_academi_horizon.png";

const getBrandLogoPath = (): string | null => {
  const candidatePaths = [
    path.resolve(process.cwd(), "apps/web/public", BRAND_LOGO_FILENAME),
    path.resolve(__dirname, "../../../../web/public", BRAND_LOGO_FILENAME),
    path.resolve(__dirname, "../../../web/public", BRAND_LOGO_FILENAME)
  ];

  return candidatePaths.find((candidatePath) => existsSync(candidatePath)) ?? null;
};

const getBrandLogoAttachment = (): Mail.Attachment | null => {
  const logoPath = getBrandLogoPath();

  if (!logoPath) {
    return null;
  }

  return {
    cid: BRAND_LOGO_CID,
    contentType: "image/png",
    filename: BRAND_LOGO_FILENAME,
    path: logoPath
  };
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const formatHeaderSubtitle = (subject: string): string => {
  const normalizedSubject = subject
    .replace(new RegExp(`^${escapeRegExp(BRANDING.schoolName)}\\s*[-–—:]\\s*`, "iu"), "")
    .trim();
  const subtitle = normalizedSubject.length > 0 ? normalizedSubject : subject;

  return subtitle.charAt(0).toLocaleUpperCase("fr-FR") + subtitle.slice(1);
};

const buildEmailHeadStyle = (): string => {
  return `<style>
      @media only screen and (max-width: 600px) {
        .email-shell {
          border-radius: 0 !important;
          width: 100% !important;
        }

        .email-outer {
          padding: 0 !important;
        }

        .brand-header {
          padding: 24px 18px !important;
        }

        .brand-logo-cell,
        .brand-text-cell {
          display: block !important;
          width: 100% !important;
          padding: 0 !important;
          text-align: center !important;
        }

        .brand-logo {
          margin: 0 auto 14px !important;
          width: 86px !important;
          max-width: 86px !important;
        }

        .brand-title {
          font-size: 28px !important;
          line-height: 1.12 !important;
        }

        .brand-subtitle {
          font-size: 15px !important;
        }

        .email-content {
          padding: 24px 20px !important;
        }
      }
    </style>`;
};

const buildBrandHeaderHtml = (subtitle: string): string => {
  const logoHtml = getBrandLogoPath()
    ? `<img class="brand-logo" src="cid:${BRAND_LOGO_CID}" alt="${escapeHtml(BRANDING.schoolName)}" width="92" style="display:block;width:92px;max-width:92px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<span style="display:inline-block;color:#E7C74D;font-size:34px;font-weight:800;letter-spacing:0;line-height:1;">AH</span>`;

  return `<div class="brand-header" style="background:#123F30;background-image:linear-gradient(180deg,#123F30,#174D38);border-bottom:4px solid #D4A24C;padding:30px 34px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td class="brand-logo-cell" width="112" valign="middle" style="width:112px;padding:0 20px 0 0;">
                ${logoHtml}
              </td>
              <td class="brand-text-cell" valign="middle" style="padding:0;">
                <div class="brand-title" style="color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:36px;font-weight:800;line-height:1.12;letter-spacing:0;">
                  ${escapeHtml(BRANDING.schoolName)}
                </div>
                <div class="brand-subtitle" style="margin-top:8px;color:rgba(255,255,255,0.82);font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:600;line-height:1.45;">
                  ${escapeHtml(subtitle)}
                </div>
              </td>
            </tr>
          </table>
        </div>`;
};

const buildInstitutionalSignatureHtml = (): string => {
  return `<div style="border-top:1px solid #E5E7EB;margin:26px 0 0;padding:18px 0 0;">
          <p style="margin:0;color:#4B5563;font-size:14px;font-weight:700;line-height:1.55;">
            ${escapeHtml(BRANDING.schoolName)}<br />
            Service Inscriptions
          </p>
          <p style="margin:10px 0 0;color:#6B7280;font-size:13px;line-height:1.55;">
            <a href="mailto:${escapeHtml(BRANDING.contactEmail)}" style="color:#1F8A3A;text-decoration:none;">
              📧 ${escapeHtml(BRANDING.contactEmail)}
            </a>
          </p>
        </div>`;
};

const getSmtpConfig = () => {
  const { host, port, secure, user, pass, from } = config.email;

  if (!host || !port || !user || !pass || !from) {
    throw new Error("SMTP configuration is incomplete");
  }

  return {
    host,
    port,
    secure,
    from,
    auth: { user, pass }
  };
};

const redactSecret = (value: string): string => {
  const { pass } = config.email;

  if (!pass) {
    return value;
  }

  return value.split(pass).join("[REDACTED]");
};

const getSmtpErrorMetadata = (error: unknown): SmtpErrorMetadata => {
  if (!(error instanceof Error)) {
    return {
      message: redactSecret(String(error))
    };
  }

  const errorWithMetadata = error as Error & {
    code?: unknown;
    command?: unknown;
    responseCode?: unknown;
    response?: unknown;
  };

  return {
    name: error.name,
    message: redactSecret(error.message),
    code: errorWithMetadata.code,
    command: errorWithMetadata.command,
    responseCode: errorWithMetadata.responseCode,
    response:
      typeof errorWithMetadata.response === "string"
        ? redactSecret(errorWithMetadata.response)
        : errorWithMetadata.response
  };
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const textToHtmlParagraphs = (value: string): string => {
  return value
    .split(/\r?\n\r?\n/u)
    .map((paragraph) => {
      const htmlLines = paragraph
        .split(/\r?\n/u)
        .map((line) => escapeHtml(line))
        .join("<br />");

      return `<p style="margin:0 0 16px;color:#1F2937;font-size:15px;line-height:1.7;">${htmlLines}</p>`;
    })
    .join("");
};

const buildApplicationMailHtml = (subject: string, body: string): string => {
  const safeSubject = escapeHtml(subject);
  const htmlBody = textToHtmlParagraphs(body);
  const headerHtml = buildBrandHeaderHtml(formatHeaderSubtitle(subject));
  const signatureHtml = buildInstitutionalSignatureHtml();

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeSubject}</title>
    ${buildEmailHeadStyle()}
  </head>
  <body style="margin:0;background:#F8F6F2;color:#1F2937;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-outer" style="background:#F8F6F2;padding:32px 16px;">
      <div class="email-shell" style="width:100%;max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 16px 36px rgba(31,41,55,0.08);">
        ${headerHtml}
        <div class="email-content" style="padding:32px;">
          <div style="color:#1F2937;font-size:15px;line-height:1.7;">
            ${htmlBody}
          </div>
          ${signatureHtml}
        </div>
      </div>
    </div>
  </body>
</html>`;
};

const sendMail = async ({
  attachments,
  to,
  subject,
  text,
  html
}: SendMailInput): Promise<void> => {
  const smtpConfig = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth
  });

  try {
    const brandLogoAttachment = html ? getBrandLogoAttachment() : null;

    await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      text: appendTextSignature(text),
      html,
      attachments: brandLogoAttachment
        ? [brandLogoAttachment, ...(attachments ?? [])]
        : attachments
    });
  } catch (error) {
    console.error("SMTP email sending failed", getSmtpErrorMetadata(error));
    throw new Error("Email sending failed");
  }
};

export const sendApplicationMail = async ({
  attachments = [],
  to,
  subject,
  body
}: SendApplicationMailInput): Promise<void> => {
  await sendMail({
    attachments,
    to,
    subject,
    text: body,
    html: buildApplicationMailHtml(subject, body)
  });
};

export const sendPlainTextMail = async ({
  to,
  subject,
  body
}: SendApplicationMailInput): Promise<void> => {
  await sendMail({
    to,
    subject,
    text: body
  });
};

export const sendPasswordResetMail = async (
  to: string,
  resetLink: string
): Promise<void> => {
  const safeResetLink = escapeHtml(resetLink);
  const headerHtml = buildBrandHeaderHtml("Réinitialisation de votre mot de passe");
  const signatureHtml = buildInstitutionalSignatureHtml();
  const text = `Bonjour,

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte administrateur.

Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :

${resetLink}

Ce lien est valable 30 minutes.

Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.`;

  await sendMail({
    to,
    subject: `${BRANDING.schoolName} - Réinitialisation de votre mot de passe`,
    text,
    html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Réinitialisation de votre mot de passe</title>
    ${buildEmailHeadStyle()}
  </head>
  <body style="margin:0;background:#f8f6f2;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-outer" style="padding:32px 16px;">
      <div class="email-shell" style="width:100%;margin:0 auto;max-width:560px;border:1px solid #ede7de;border-radius:18px;background:#ffffff;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        ${headerHtml}
        <div class="email-content" style="padding:32px;">
          <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.65;">
            Bonjour,
          </p>
          <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.65;">
            Une demande de réinitialisation de mot de passe a été effectuée pour votre compte administrateur.
          </p>
          <p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.65;">
            Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${safeResetLink}" style="display:inline-block;border-radius:12px;background:#D4A24C;color:#ffffff;font-size:16px;font-weight:700;line-height:1.2;padding:14px 22px;text-decoration:none;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65;">
            Ce lien est valable 30 minutes.
          </p>
          <p style="margin:0 0 22px;color:#334155;font-size:15px;line-height:1.65;">
            Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.
          </p>
          ${signatureHtml}
        </div>
      </div>
    </div>
  </body>
</html>`
  });
};
