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
