import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { Environment } from './config.js';
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
export function createEmailSender(env: Environment): EmailSender {
  if (env.EMAIL_TRANSPORT === 'resend') {
    const resend = new Resend(env.RESEND_API_KEY);
    return {
      async send(message) {
        const result = await resend.emails.send({ ...message, from: env.EMAIL_FROM });
        if (result.error) throw new Error('Email provider rejected delivery');
      },
    };
  }
  const smtp = nodemailer.createTransport(env.SMTP_URL);
  return {
    async send(message) {
      await smtp.sendMail({ ...message, from: env.EMAIL_FROM });
    },
  };
}
