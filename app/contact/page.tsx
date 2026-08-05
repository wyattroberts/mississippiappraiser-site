import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Request a Commercial Appraisal",
  description: "Contact Mississippi Appraiser for a commercial property appraisal or real estate consulting assignment.",
};

export default function ContactPage() {
  return (
    <main>
      <section className="contact-page shell">
        <div>
          <p className="eyebrow">Request an appraisal</p>
          <h1>Tell us about the property.</h1>
          <p className="prose-large">For a fee quote, send the property address, property type, intended use, and desired timing.</p>
          <div className="contact-cards compact-contact-cards">
            <a href="tel:+16017063391"><span>Call</span><strong>(601) 706-3391</strong></a>
            <a href="#contact-form"><span>Online</span><strong>Send a secure message</strong></a>
          </div>
          <ContactForm />
        </div>
        <aside className="contact-aside">
          <p className="footer-label">Helpful information to include</p>
          <ol>
            <li>Property address or parcel location</li>
            <li>Property type and approximate size</li>
            <li>Purpose of the appraisal</li>
            <li>Requested completion date</li>
            <li>Your name and best callback number</li>
          </ol>
          <p className="mailing">Mississippi Appraiser<br />P.O. Box 1094<br />Florence, MS 39073</p>
        </aside>
      </section>
    </main>
  );
}
