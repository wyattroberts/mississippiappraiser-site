import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadPanel } from "@/components/lead-panel";
import { counties, findCounty } from "@/lib/content";

type Params = Promise<{ segments?: string[] }>;

function resolveLocation(segments: string[] = []) {
  if (segments.length === 0) return { county: null, city: null, name: "Mississippi" };
  const county = findCounty(segments[0]);
  if (!county) return null;
  if (segments.length === 1) return { county, city: null, name: `${county.name}, Mississippi` };
  if (segments.length !== 2) return null;
  const city = county.cities.find((item) => item.slug === segments[1]);
  return city ? { county, city, name: `${city.name}, ${county.name}, Mississippi` } : null;
}

export function generateStaticParams() {
  return [
    { segments: [] },
    ...counties.flatMap((county) => [
      { segments: [county.slug] },
      ...county.cities.map((city) => ({ segments: [county.slug, city.slug] })),
    ]),
  ];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const location = resolveLocation((await params).segments);
  if (!location) return {};
  return {
    title: `Commercial Property Appraiser in ${location.name}`,
    description: `Commercial real estate appraisal, land valuation, and consulting services in ${location.name}.`,
  };
}

export default async function LocationPage({ params }: { params: Params }) {
  const location = resolveLocation((await params).segments);
  if (!location) notFound();
  return (
    <main>
      <header className="location-hero">
        <div className="shell">
          <p className="eyebrow light">Commercial real estate valuation</p>
          <h1>Commercial property appraiser in {location.name}</h1>
          <p>Independent commercial appraisal and consulting for buildings, investment properties, and land.</p>
          <a className="button button-primary" href="/contact/">Request a quote</a>
        </div>
      </header>
      <section className="section shell location-grid">
        <div>
          <p className="eyebrow">Local assignments · Statewide resources</p>
          <h2>Commercial appraisal work grounded in the property’s market.</h2>
          <p className="prose-large">
            We appraise office buildings, retail properties, shopping centers, apartment complexes, industrial and warehouse properties, churches, development sites, and agricultural, timber, and hunting land throughout {location.name}.
          </p>
          <p>
            Each assignment considers the property’s location, competitive market, physical characteristics, income potential, and intended use of the appraisal.
          </p>
        </div>
        <aside className="credential-card">
          <span className="credential-mark">MAI</span>
          <h3>MAI-designated appraisal expertise</h3>
          <p>Careful research, transparent reasoning, and reports developed for the assignment at hand.</p>
          <ul>
            <li>Commercial buildings</li>
            <li>Multifamily properties</li>
            <li>Development and rural land</li>
            <li>Special-purpose real estate</li>
          </ul>
        </aside>
      </section>
      {location.county?.cities.length ? (
        <section className="section section-soft">
          <div className="shell">
            <p className="eyebrow">Communities served</p>
            <h2>Appraisal service in {location.county.name}</h2>
            <div className="inline-links">
              {location.county.cities.map((city) => (
                <a key={city.slug} href={`/service-area/mississippi/${location.county?.slug}/${city.slug}/`}>{city.name}</a>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <div className="shell lead-wrap"><LeadPanel location={location.name} /></div>
    </main>
  );
}

