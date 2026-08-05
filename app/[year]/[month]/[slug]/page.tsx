import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadPanel } from "@/components/lead-panel";
import { findPost, formatPostDate, postDescription, posts, postHref } from "@/lib/content";

type Params = Promise<{ year: string; month: string; slug: string }>;

export function generateStaticParams() {
  return posts.map((post) => {
    const [, year, month, slug] = postHref(post).split("/");
    return { year, month, slug };
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { year, month, slug } = await params;
  const post = findPost(year, month, slug);
  if (!post) return {};
  const canonical = postHref(post);
  const description = postDescription(post);
  return {
    title: post.seoTitle || post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description,
      url: canonical,
      publishedTime: post.date,
      modifiedTime: post.modified,
      authors: ["Wyatt Roberts, MAI"],
      images: post.featuredImage ? [{ url: post.featuredImage, alt: post.featuredImageAlt || post.title }] : [],
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { year, month, slug } = await params;
  const post = findPost(year, month, slug);
  if (!post) notFound();
  const schemaImage = post.featuredImage
    ? (post.featuredImage.startsWith("https://") ? post.featuredImage : `https://mississippiappraiser.com${post.featuredImage}`)
    : undefined;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: postDescription(post),
    datePublished: post.date,
    dateModified: post.modified,
    author: { "@type": "Person", name: "Wyatt Roberts, MAI" },
    publisher: { "@type": "Organization", name: "Mississippi Appraiser" },
    mainEntityOfPage: `https://mississippiappraiser.com${postHref(post)}`,
    image: schemaImage ? [schemaImage] : undefined,
  };
  return (
    <main>
      <article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} />
        <header className="article-header shell-narrow">
          <a className="back-link" href="/blog/">← Appraiser blog</a>
          <p className="post-date">{formatPostDate(post.date)} · Wyatt Roberts</p>
          <h1>{post.title}</h1>
        </header>
        {post.featuredImage && (
          <div className="article-image shell"><img src={post.featuredImage} alt={post.featuredImageAlt || post.title} /></div>
        )}
        <div className="article-body shell-narrow" dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
      <div className="shell lead-wrap"><LeadPanel /></div>
    </main>
  );
}
