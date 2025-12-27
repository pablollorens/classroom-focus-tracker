import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.NODE_ENV === "production"
  ? "Kibo Class <noreply@kiboclass.com>"
  : "Kibo Class <onboarding@resend.dev>";

const BASE_URL = process.env.NODE_ENV === "production"
  ? "https://www.kiboclass.com"
  : "http://localhost:3000";

interface PasswordResetEmailParams {
  to: string;
  token: string;
  locale: string;
}

const translations: Record<string, {
  subject: string;
  greeting: string;
  body: string;
  button: string;
  expiry: string;
  ignore: string;
  team: string;
}> = {
  es: {
    subject: "Restablecer tu contraseña - Kibo Class",
    greeting: "Hola,",
    body: "Recibimos una solicitud para restablecer la contraseña de tu cuenta en Kibo Class.",
    button: "Restablecer Contraseña",
    expiry: "Este enlace expira en 1 hora.",
    ignore: "Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña permanecerá sin cambios.",
    team: "El equipo de Kibo Class",
  },
  en: {
    subject: "Reset your password - Kibo Class",
    greeting: "Hello,",
    body: "We received a request to reset the password for your Kibo Class account.",
    button: "Reset Password",
    expiry: "This link expires in 1 hour.",
    ignore: "If you didn't request this change, you can ignore this email. Your password will remain unchanged.",
    team: "The Kibo Class Team",
  },
  nl: {
    subject: "Wachtwoord opnieuw instellen - Kibo Class",
    greeting: "Hallo,",
    body: "We hebben een verzoek ontvangen om het wachtwoord van je Kibo Class account opnieuw in te stellen.",
    button: "Wachtwoord Opnieuw Instellen",
    expiry: "Deze link verloopt over 1 uur.",
    ignore: "Als je deze wijziging niet hebt aangevraagd, kun je deze email negeren. Je wachtwoord blijft ongewijzigd.",
    team: "Het Kibo Class Team",
  },
};

export async function sendPasswordResetEmail({ to, token, locale }: PasswordResetEmailParams) {
  const t = translations[locale] || translations.en;
  const resetUrl = `${BASE_URL}/reset-password?token=${token}&lang=${locale}`;

  // Dev mode: log to console if no API key
  if (!process.env.RESEND_API_KEY) {
    console.log("\n" + "=".repeat(60));
    console.log("[DEV] Password reset email (no RESEND_API_KEY configured)");
    console.log("=".repeat(60));
    console.log(`To: ${to}`);
    console.log(`Link: ${resetUrl}`);
    console.log("=".repeat(60) + "\n");
    return { id: "dev-mock" };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f7f8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <img src="${BASE_URL}/logo.png" alt="Kibo Class" style="height: 48px;" />
        </div>

        <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          ${t.greeting}
        </p>

        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
          ${t.body}
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #137fec; color: #ffffff; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
            ${t.button}
          </a>
        </div>

        <p style="color: #718096; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
          ${t.expiry}
        </p>

        <p style="color: #718096; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
          ${t.ignore}
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

        <p style="color: #a0aec0; font-size: 14px; text-align: center;">
          — ${t.team}
        </p>
      </div>
    </body>
    </html>
  `;

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: t.subject,
    html,
  });

  if (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error("Failed to send email");
  }

  return data;
}
