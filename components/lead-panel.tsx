export function LeadPanel({ location }: { location?: string }) {
  const place = location ? ` in ${location}` : " in Mississippi";
  return (
    <section className="lead-panel" id="contact">
      <div>
        <p className="eyebrow light">Request an appraisal</p>
        <h2>Need a commercial property appraisal{place}?</h2>
        <p>
          Tell us about the property, the intended use of the appraisal, and your timing. We’ll respond with availability and a fee quote.
        </p>
      </div>
      <div className="lead-actions">
        <a className="button button-light" href="tel:+16017063391">Call (601) 706-3391</a>
        <a className="button button-outline-light" href="/contact/">Open contact form</a>
      </div>
    </section>
  );
}
