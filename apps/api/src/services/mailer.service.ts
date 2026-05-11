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
        <div style="margin:0 0 18px;">
          <span style="display:inline-block;border-radius:999px;background:#D4A24C;color:#FFFFFF;font-size:12px;font-weight:700;letter-spacing:0.04em;line-height:1;padding:8px 12px;text-transform:uppercase;">
            ECE
          </span>
        </div>
        <h1 style="margin:0 0 24px;color:#1F4D3A;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;">
          ${safeSubject}
        </h1>
        <div style="color:#1F2937;font-size:15px;line-height:1.7;">
          ${htmlBody}
        </div>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
        <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
          École de la Culture et de l’Éducation
        </p>
        <p style="margin:8px 0 0;color:#9CA3AF;font-size:12px;line-height:1.5;">
          Cet email concerne le suivi de votre demande d'inscription auprès de l'ECE.
        </p>
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
      text,
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
  const text = `Bonjour,

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte administrateur.

Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :

${resetLink}

Ce lien est valable 30 minutes.

Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.

Cordialement,
L’administration de l’École de la Culture et de l’Éducation`;

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
        <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
          Cordialement,<br />
          L’administration de l’École de la Culture et de l’Éducation
        </p>
      </div>
    </div>
  </body>
</html>`
  });
};
