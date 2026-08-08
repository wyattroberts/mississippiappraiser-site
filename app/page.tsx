import { LeadPanel } from "@/components/lead-panel";
import { counties, formatPostDate, plainText, postHref } from "@/lib/content";
import { getPublishedPosts } from "@/lib/blog-db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await getPublishedPosts(3);
  return (
    <main>
      <section className="hero">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-overlay" />
        <div className="hero-content shell">
          <p className="eyebrow light">Commercial real estate valuation · Statewide service</p>
          <h1>Clear, credible commercial property appraisals across Mississippi.</h1>
          <p className="hero-copy">
            Independent valuation and consulting for commercial buildings, multifamily properties, development land, agricultural land, timberland, and specialized real estate.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/contact/">Request a quote</a>
            <a className="text-link light-link" href="/service-area/">Explore our service area <span>→</span></a>
          </div>
        </div>
      </section>

      <section className="credibility-strip" aria-label="Practice highlights">
        <div><strong>MAI</strong><span>Designated appraisal expertise</span></div>
        <div><strong>Statewide</strong><span>{counties.length} Mississippi counties served</span></div>
        <div><strong>Independent</strong><span>Analysis built for the assignment</span></div>
      </section>

      <section className="section shell intro-grid">
        <div>
          <p className="eyebrow">Mississippi commercial appraisal</p>
          <h2>Professional judgment, supported by better data.</h2>
        </div>
        <div className="prose-large">
          <p>
            We have appraised hundreds of millions of dollars of commercial property and land across Mississippi. Our reports combine appraisal experience with location analysis, demographic research, market data, and careful documentation.
          </p>
          <p>
            Every assignment is developed around the property, the market, and the client’s intended use—not a one-size-fits-all report.
          </p>
        </div>
      </section>

      <section className="section section-soft">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Property types</p>
              <h2>Commercial property and land</h2>
            </div>
            <p>Appraisal and consulting services for lending, estates, litigation, acquisition, disposition, taxation, and planning.</p>
          </div>
          <div className="service-grid">
            {[
              ["Office & retail", "Office buildings, storefronts, shopping centers, restaurants, and owner-occupied commercial properties."],
              ["Industrial", "Warehouses, manufacturing facilities, flex buildings, and other industrial real estate."],
              ["Multifamily", "Apartment complexes and other income-producing residential properties."],
              ["Land", "Commercial, agricultural, timber, hunting, development, and special-use land."],
              ["Special-purpose", "Churches, daycare facilities, schools, and properties requiring specialized market analysis."],
              ["Consulting", "Market analysis, appraisal review, litigation support, and real estate consulting."],
            ].map(([title, copy], index) => (
              <article className="service-card" key={title}>
                <span className="card-number">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell area-preview">
        <div className="area-copy">
          <p className="eyebrow">Service area</p>
          <h2>Local market work across all 82 counties.</h2>
          <p>
            From the Gulf Coast to the Delta and from metropolitan Jackson to Mississippi’s rural communities, we travel statewide for commercial appraisal assignments.
          </p>
          <a className="text-link" href="/service-area/">View every county <span>→</span></a>
        </div>
        <div className="county-sample" aria-label="Sample counties">
          {counties.slice(0, 12).map((county) => (
            <a href={`/service-area/mississippi/${county.slug}/`} key={county.slug}>{county.name}</a>
          ))}
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell">
          <div className="section-heading dark-heading">
            <div>
              <p className="eyebrow light">From the appraiser’s blog</p>
              <h2>Appraisal, real estate, data, and technology.</h2>
            </div>
            <a className="text-link light-link" href="/blog/">Read all posts <span>→</span></a>
          </div>
          <div className="post-grid">
            {posts.map((post) => (
              <article className="post-card" key={post.id}>
                {post.featuredImage && <img src={post.featuredImage} alt="" />}
                <div className="post-card-body">
                  <p className="post-date">{formatPostDate(post.date)}</p>
                  <h3><a href={postHref(post)}>{post.title}</a></h3>
                  <p>{plainText(post.excerpt)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="shell lead-wrap"><LeadPanel /></div>
    </main>
  );
}
