import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { errorMessages } from "../utils/ErrorMessage.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: 10_000,
    socketTimeout: 10_000,
  });

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: "Your PadosiPro verification code",
      text: [
        `Your verification code is ${code}.`,
        "",
        "It expires in 10 minutes and can only be used once.",
        "If you did not create a PadosiPro account, you can ignore this email.",
      ].join("\n"),
    });
  } catch (error) {
    console.error(
      "OTP email failed",
      error instanceof Error ? error.message : "unknown mail error",
    );
    throw new AppError(
      HTTP_STATUS.BAD_GATEWAY,
      "EMAIL_FAILED",
      errorMessages.AUTH.EMAIL_FAILED,
    );
  }
}
