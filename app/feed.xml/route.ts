import { postDescription, postHref } from "@/lib/content";
import { getPublishedPosts } from "@/lib/blog-db";

export const dynamic = "force-dynamic";

function xml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] || character);
}

export async function GET() {
  const base = "https://mississippiappraiser.com";
  const posts = await getPublishedPosts(25);
  const items = posts.map((post) => `
    <item>
      <title>${xml(post.title)}</title>
      <link>${base}${postHref(post)}</link>
      <guid isPermaLink="true">${base}${postHref(post)}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${xml(postDescription(post))}</description>
    </item>`).join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Mississippi Appraiser</title>
    <link>${base}/blog/</link>
    <description>Appraisal, real estate, data, and technology from Wyatt Roberts, MAI.</description>
    <language>en-us</language>${items}
  </channel>
</rss>`, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
