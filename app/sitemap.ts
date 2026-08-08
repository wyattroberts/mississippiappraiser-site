import type { MetadataRoute } from "next";
import { counties, postHref } from "@/lib/content";
import { getPublishedPosts } from "@/lib/blog-db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://mississippiappraiser.com";
  const posts = await getPublishedPosts();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/blog/`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/service-area/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/service-area/mississippi/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/contact/`, changeFrequency: "yearly", priority: 0.8 },
    ...posts.map((post) => ({ url: `${base}${postHref(post)}`, lastModified: post.modified, priority: 0.6 })),
    ...counties.flatMap((county) => [
      { url: `${base}/service-area/mississippi/${county.slug}/`, priority: 0.7 },
      ...county.cities.map((city) => ({ url: `${base}/service-area/mississippi/${county.slug}/${city.slug}/`, priority: 0.7 })),
    ]),
  ];
}
