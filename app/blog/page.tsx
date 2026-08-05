import type { Metadata } from "next";
import { posts, formatPostDate, plainText, postHref } from "@/lib/content";

export const metadata: Metadata = {
  title: "The Commercial Appraiser’s Blog",
  description: "Articles about appraisal theory, real estate, technology, statistics, GIS, and location intelligence.",
};

export default function BlogPage() {
  return (
    <main>
      <header className="page-hero shell">
        <p className="eyebrow">The commercial appraiser’s blog</p>
        <h1>Appraisal, real estate, data, and technology.</h1>
        <p>Notes on appraisal practice, statistics, artificial intelligence, GIS, location intelligence, cartography, and the occasional experiment.</p>
      </header>
      <section className="section shell">
        <div className="blog-list">
          {posts.map((post) => (
            <article className="blog-row" key={post.id}>
              <a className="blog-thumb" href={postHref(post)}>
                {post.featuredImage ? <img src={post.featuredImage} alt={post.featuredImageAlt || ""} /> : <span>MA</span>}
              </a>
              <div>
                <p className="post-date">{formatPostDate(post.date)} · {post.categories.join(", ")}</p>
                <h2><a href={postHref(post)}>{post.title}</a></h2>
                <p>{plainText(post.excerpt)}</p>
                <a className="text-link" href={postHref(post)}>Read article <span>→</span></a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
