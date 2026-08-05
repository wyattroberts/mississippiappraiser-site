"use client";

import { FormEvent, useMemo, useState } from "react";

type FormState = {
  name: string;
  phone: string;
  subject: string;
  email: string;
  message: string;
  smsConsent: boolean;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  subject: "Appraisal Request",
  email: "",
  message: "",
  smsConsent: false,
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [status, setStatus] = useState("");

  const ready = useMemo(() => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    return Boolean(form.name.trim() && phoneDigits.length >= 10 && validEmail && form.message.trim());
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (state === "error") {
      setState("idle");
      setStatus("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) {
      setState("error");
      setStatus("Please enter your name, a valid phone number and email address, and a message.");
      return;
    }

    setState("sending");
    setStatus("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          subject: form.subject,
          email: form.email.trim(),
          message: form.message.trim(),
          sms_consent: form.smsConsent,
        }),
      });
      if (!response.ok) throw new Error(`Contact request failed: ${response.status}`);
      setState("success");
      setStatus("Message sent! We’ll be in touch soon.");
      setForm(initialForm);
    } catch {
      setState("error");
      setStatus("Something went wrong. Please try again or call (601) 951-4280.");
    }
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <p className="required-note"><span aria-hidden="true">*</span> Name, phone number, email address, and message are required. SMS consent is optional.</p>
      <div className="contact-form-grid">
        <label className="form-field">
          <span>Your Name <b aria-hidden="true">*</b></span>
          <input autoComplete="name" placeholder="Jane Smith" value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </label>
        <label className="form-field">
          <span>Phone Number <b aria-hidden="true">*</b></span>
          <input autoComplete="tel" inputMode="tel" placeholder="(601) 555-0100" value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
        </label>
        <label className="form-field">
          <span>Subject</span>
          <select value={form.subject} onChange={(event) => update("subject", event.target.value)}>
            <option value="">— Select a topic —</option>
            <option value="Appraisal Request">Appraisal Request</option>
            <option value="Real Estate Brokerage">Real Estate Brokerage</option>
            <option value="General Inquiry">General Inquiry</option>
          </select>
        </label>
        <label className="form-field">
          <span>Email Address <b aria-hidden="true">*</b></span>
          <input autoComplete="email" inputMode="email" type="email" placeholder="jane@example.com" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        </label>
        <label className="form-field full-field">
          <span>Message <b aria-hidden="true">*</b></span>
          <textarea placeholder="Tell us about the property, assignment, and timing..." value={form.message} onChange={(event) => update("message", event.target.value)} required />
        </label>
        <div className={`sms-consent-field full-field${form.smsConsent ? " checked" : ""}`}>
          <input id="sms-consent" type="checkbox" checked={form.smsConsent} onChange={(event) => update("smsConsent", event.target.checked)} />
          <label htmlFor="sms-consent">
            Do you prefer to communicate via text? Check this box if that’s how you’d like to hear from us instead of calls or email—for appointment reminders, document requests, and appraisal updates. It’s optional and won’t change the service you receive. Message frequency varies; message and data rates may apply. Reply STOP anytime to opt out, or HELP for help. View the Wyattopia <a href="https://wyattopia.com/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, <a href="https://wyattopia.com/terms.html" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>, and <a href="https://wyattopia.com/sms-policy.html" target="_blank" rel="noopener noreferrer">SMS Policy</a>.
          </label>
        </div>
      </div>
      <div className="form-footer">
        <button className={`button button-primary${ready ? " ready" : ""}`} disabled={state === "sending"} type="submit">
          {state === "sending" ? "Sending…" : state === "success" ? "Sent ✓" : "Send Message"}
        </button>
        <p className={`form-status ${state}`} role="status" aria-live="polite">{status}</p>
      </div>
    </form>
  );
}

