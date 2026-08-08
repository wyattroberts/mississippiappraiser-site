import postsJson from "@/data/posts.json";
import pagesJson from "@/archive/wordpress-pages.json";

export type Post = {
  id: number;
  date: string;
  modified: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  categories: string[];
  tags?: string[];
  featuredImage: string | null;
  featuredImageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: "draft" | "published" | "archived";
  originalUrl: string;
};

export type City = { name: string; slug: string };
export type County = { name: string; slug: string; cities: City[] };

type ArchivedPage = {
  id: number;
  slug: string;
  parent: number;
  title: { rendered: string };
};

function cleanLegacyHtml(html: string) {
  return html
    .replace(/\[\/?et_pb_[^\]]*\]/g, "")
    .replace(/image-(?:1024x912|980x873|480x428)\.png/g, "image.png");
}

export const allPosts = (postsJson as Post[])
  .map((post) => ({
    ...post,
    status: post.status ?? "published",
    tags: post.tags ?? [],
    content: cleanLegacyHtml(post.content),
  }))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const posts = allPosts.filter((post) => post.status === "published");

const archivedPages = pagesJson as ArchivedPage[];
const mississippiPage = archivedPages.find((page) => page.slug === "mississippi");

export const counties: County[] = archivedPages
  .filter((page) => page.parent === mississippiPage?.id && page.slug.endsWith("-county"))
  .sort((a, b) => a.title.rendered.localeCompare(b.title.rendered))
  .map((county) => ({
    name: county.title.rendered,
    slug: county.slug,
    cities: archivedPages
      .filter((page) => page.parent === county.id)
      .sort((a, b) => a.title.rendered.localeCompare(b.title.rendered))
      .map((city) => ({ name: city.title.rendered, slug: city.slug })),
  }));

export function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}

export function postHref(post: Post) {
  const date = new Date(post.date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `/${year}/${month}/${post.slug}/`;
}

export function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function postDescription(post: Post) {
  return (post.seoDescription || plainText(post.excerpt) || plainText(post.content)).slice(0, 160);
}

export function findPost(year: string, month: string, slug: string) {
  return posts.find((post) => postHref(post) === `/${year}/${month}/${slug}/`);
}

export function findCounty(slug: string) {
  return counties.find((county) => county.slug === slug);
}
