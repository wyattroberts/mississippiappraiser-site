import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadPanel } from "@/components/lead-panel";
import { findPost, formatPostDate, posts, postHref } from "@/lib/content";

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
  return post ? { title: post.title } : {};
}

export default async function PostPage({ params }: { params: Params }) {
  const { year, month, slug } = await params;
  const post = findPost(year, month, slug);
  if (!post) notFound();
  return (
    <main>
      <article>
        <header className="article-header shell-narrow">
          <a className="back-link" href="/blog/">← Appraiser blog</a>
          <p className="post-date">{formatPostDate(post.date)} · Wyatt Roberts</p>
          <h1>{post.title}</h1>
        </header>
        {post.featuredImage && (
          <div className="article-image shell"><img src={post.featuredImage} alt="" /></div>
        )}
        <div className="article-body shell-narrow" dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
      <div className="shell lead-wrap"><LeadPanel /></div>
    </main>
  );
}

