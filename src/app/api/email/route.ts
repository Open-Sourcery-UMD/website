import { NextResponse } from "next/server";
import { sendEmail } from "@lib/emailService";

export async function POST(req: Request) {
  try {
    const { recipients, subject, message } = await req.json();

    await sendEmail(recipients, subject, message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err },
      { status: 500 }
    );
  }
}
