import type { Metadata } from "next";
import { LeadPanel } from "@/components/lead-panel";
import { counties } from "@/lib/content";

export const metadata: Metadata = {
  title: "Service Area",
  description: "Commercial property appraisal and real estate consulting throughout Mississippi.",
};

export default function ServiceAreaPage() {
  return (
    <main>
      <header className="page-hero shell">
        <p className="eyebrow">Statewide commercial appraisal</p>
        <h1>Serving all 82 Mississippi counties.</h1>
        <p>Commercial property appraisal, land valuation, and real estate consulting across Mississippi.</p>
      </header>
      <section className="section shell">
        <div className="county-directory">
          {counties.map((county) => (
            <article key={county.slug}>
              <a href={`/service-area/mississippi/${county.slug}/`}>{county.name}</a>
              {county.cities.length > 0 && (
                <div className="city-links">
                  {county.cities.map((city) => (
                    <a key={city.slug} href={`/service-area/mississippi/${county.slug}/${city.slug}/`}>{city.name}</a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <div className="shell lead-wrap"><LeadPanel /></div>
    </main>
  );
}

