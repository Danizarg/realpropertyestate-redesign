import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, interest, message, propertyId, propertyName, website } = body;

  // Honeypot: real users never fill this hidden field. Pretend success so
  // bots don't learn to adapt.
  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase.from("contact_submissions").insert({
      name,
      email,
      phone: phone || null,
      interest: interest || null,
      property_id: propertyId || null,
      message,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const ownerEmail = process.env.OWNER_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && ownerEmail) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Real Property Estate <onboarding@resend.dev>",
        to: ownerEmail,
        replyTo: email,
        subject: propertyName ? `New enquiry: ${propertyName}` : "New contact form submission",
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          phone ? `Phone: ${phone}` : null,
          interest ? `Interest: ${interest}` : null,
          propertyName ? `Property: ${propertyName}` : null,
          "",
          message,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
    }
  }

  return NextResponse.json({ ok: true });
}
