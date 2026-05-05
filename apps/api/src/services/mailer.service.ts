import nodemailer from "nodemailer";

import { config } from "../config/env";

export type SendApplicationMailInput = {
  to: string;
  subject: string;
  body: string;
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

export const sendApplicationMail = async ({
  to,
  subject,
  body
}: SendApplicationMailInput): Promise<void> => {
  await sendPlainTextMail({
    to,
    subject,
    body
  });
};

export const sendPlainTextMail = async ({
  to,
  subject,
  body
}: SendApplicationMailInput): Promise<void> => {
  const smtpConfig = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.auth
  });

  await transporter.sendMail({
    from: smtpConfig.from,
    to,
    subject,
    text: body
  });
};

export const sendPasswordResetMail = async (
  to: string,
  resetLink: string
): Promise<void> => {
  await sendPlainTextMail({
    to,
    subject: "ECE - Réinitialisation de votre mot de passe",
    body: `Bonjour,

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte administrateur.

Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :

${resetLink}

Ce lien est valable 30 minutes.

Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.

Cordialement,
L’administration de l’École de la Culture et de l’Éducation`
  });
};
