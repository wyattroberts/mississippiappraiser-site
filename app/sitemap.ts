import type { MetadataRoute } from "next";
import { counties, posts, postHref } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mississippiappraiser.com";
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

