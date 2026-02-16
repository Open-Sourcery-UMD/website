const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email";

const sender = {
  name: "Open Sourcery",
  email: "umdopensourcery@gmail.com",
};

const replyTo = sender;

export async function sendEmail(
  recipients: string[],
  subject: string,
  message: string
) {
  const to = recipients.map((r) => {
    const match = r.match(/(.*)<(.+)>/);
    return match
      ? { name: match[1].trim(), email: match[2].trim() }
      : { email: r };
  });

  if (!EMAIL_API_KEY) {
    throw new Error("Missing Brevo email API key");
  }

  const response = await fetch(EMAIL_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "api-key": EMAIL_API_KEY,
    },
    body: JSON.stringify({
      sender,
      to: to.length > 0 ? to : [sender],
      subject,
      textContent: message,
      replyTo,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Brevo error:", errorText);
    throw new Error(await response.text());
  }

  return { success: true };
}
