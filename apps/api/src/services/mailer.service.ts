import nodemailer from "nodemailer";

import { config } from "../config/env";

export type SendApplicationMailInput = {
  to: string;
  subject: string;
  body: string;
};

type SendMailInput = {
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

École ECE Narbonne
Service Inscriptions

📧 ece.inscriptions@gmail.com`;

const appendTextSignature = (value: string): string => {
  return `${value.trimEnd()}\n\n${INSTITUTIONAL_TEXT_SIGNATURE}`;
};

const buildEceLogoHtml = (): string => {
  return `<div style="margin:0 0 22px;">
          <span style="display:inline-block;border:1px solid #E6E1D8;border-radius:10px;background:#FFFFFF;padding:8px 11px;font-family:Arial,Helvetica,sans-serif;font-size:0;line-height:1;box-shadow:0 6px 16px rgba(31,41,55,0.06);">
            <span style="display:inline-block;color:#1F8A3A;font-size:24px;font-weight:800;letter-spacing:0;line-height:1;">E</span>
            <span style="display:inline-block;color:#E7C74D;font-size:24px;font-weight:800;letter-spacing:0;line-height:1;">C</span>
            <span style="display:inline-block;color:#1F8A3A;font-size:24px;font-weight:800;letter-spacing:0;line-height:1;">E</span>
          </span>
        </div>`;
};

const buildInstitutionalSignatureHtml = (): string => {
  return `<div style="border-top:1px solid #E5E7EB;margin:26px 0 0;padding:18px 0 0;">
          <p style="margin:0 0 12px;color:#6B7280;font-size:14px;line-height:1.65;">
            Cordialement,
          </p>
          <p style="margin:0;color:#4B5563;font-size:14px;font-weight:700;line-height:1.55;">
            École ECE Narbonne<br />
            Service Inscriptions
          </p>
          <p style="margin:10px 0 0;color:#6B7280;font-size:13px;line-height:1.55;">
            <a href="mailto:ece.inscriptions@gmail.com" style="color:#1F8A3A;text-decoration:none;">
              📧 ece.inscriptions@gmail.com
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
  const logoHtml = buildEceLogoHtml();
  const signatureHtml = buildInstitutionalSignatureHtml();

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;background:#F8F6F2;color:#1F2937;font-family:Arial,Helvetica,sans-serif;">
    <div style="background:#F8F6F2;padding:32px 16px;">
      <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:32px;box-shadow:0 16px 36px rgba(31,41,55,0.08);">
        ${logoHtml}
        <h1 style="margin:0 0 24px;color:#1F4D3A;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;">
          ${safeSubject}
        </h1>
        <div style="color:#1F2937;font-size:15px;line-height:1.7;">
          ${htmlBody}
        </div>
        ${signatureHtml}
      </div>
    </div>
  </body>
</html>`;
};

const sendMail = async ({
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
    await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      text: appendTextSignature(text),
      html
    });
  } catch (error) {
    console.error("SMTP email sending failed", getSmtpErrorMetadata(error));
    throw new Error("Email sending failed");
  }
};

export const sendApplicationMail = async ({
  to,
  subject,
  body
}: SendApplicationMailInput): Promise<void> => {
  await sendMail({
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
  const logoHtml = buildEceLogoHtml();
  const signatureHtml = buildInstitutionalSignatureHtml();
  const text = `Bonjour,

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte administrateur.

Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :

${resetLink}

Ce lien est valable 30 minutes.

Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.`;

  await sendMail({
    to,
    subject: "ECE - Réinitialisation de votre mot de passe",
    text,
    html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Réinitialisation de votre mot de passe</title>
  </head>
  <body style="margin:0;background:#f8f6f2;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:32px 16px;">
      <div style="margin:0 auto;max-width:560px;border:1px solid #ede7de;border-radius:18px;background:#ffffff;padding:32px;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        ${logoHtml}
        <h1 style="margin:0 0 18px;color:#1F4D3A;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;">
          Réinitialisation de votre mot de passe
        </h1>
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
  </body>
</html>`
  });
};
