import { NextRequest, NextResponse } from "next/server";

const CONTACT_ENDPOINT = "https://www.wyattopiarealty.com/api/contact";

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  const message = String(payload.message ?? "").trim();
  const smsConsent = payload.sms_consent === true;

  if (!name || !email || !message || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    const upstream = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, sms_consent: smsConsent, subject: `[Mississippi Appraiser] ${subject || "Website inquiry"}`, message }),
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Unable to send message" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to send message" }, { status: 502 });
  }
}

