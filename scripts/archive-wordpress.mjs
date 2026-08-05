import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ORIGIN = "https://mississippiappraiser.com";
const ROOT = process.cwd();

async function getJson(path) {
  const response = await fetch(`${ORIGIN}${path}`, {
    headers: { "user-agent": "MississippiAppraiserMigration/1.0" },
  });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return response.json();
}

function localizeHtml(html = "") {
  return html
    .replaceAll(`${ORIGIN}/wp-content/uploads/`, "/wp-content/uploads/")
    .replaceAll("http://mississippiappraiser.com/wp-content/uploads/", "/wp-content/uploads/")
    .replace(/\[\/?et_pb_[^\]]*\]/g, "");
}

const [posts, pages, media, categories] = await Promise.all([
  getJson("/wp-json/wp/v2/posts?per_page=100&_fields=id,date,modified,slug,link,title,excerpt,content,categories,featured_media"),
  getJson("/wp-json/wp/v2/pages?per_page=100&page=1&_fields=id,date,modified,slug,link,title,content,excerpt,parent,status").then(async (first) => [
    ...first,
    ...(await getJson("/wp-json/wp/v2/pages?per_page=100&page=2&_fields=id,date,modified,slug,link,title,content,excerpt,parent,status")),
  ]),
  getJson("/wp-json/wp/v2/media?per_page=100&_fields=id,date,slug,source_url,media_type,mime_type,alt_text,caption"),
  getJson("/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count"),
]);

const categoryNames = Object.fromEntries(categories.map((category) => [category.id, category.name]));
const mediaById = Object.fromEntries(media.map((item) => [item.id, item]));

const normalizedPosts = posts.map((post) => ({
  id: post.id,
  date: post.date,
  modified: post.modified,
  slug: post.slug,
  title: post.title.rendered,
  excerpt: localizeHtml(post.excerpt.rendered),
  content: localizeHtml(post.content.rendered),
  categories: post.categories.map((id) => categoryNames[id]).filter(Boolean),
  featuredImage: post.featured_media ? mediaById[post.featured_media]?.source_url?.replace(ORIGIN, "") ?? null : null,
  originalUrl: post.link,
}));

const mississippiPage = pages.find((page) => page.slug === "mississippi");
const counties = pages
  .filter((page) => page.parent === mississippiPage?.id && page.slug.endsWith("-county"))
  .sort((a, b) => a.title.rendered.localeCompare(b.title.rendered))
  .map((county) => ({
    name: county.title.rendered,
    slug: county.slug,
    cities: pages
      .filter((page) => page.parent === county.id)
      .sort((a, b) => a.title.rendered.localeCompare(b.title.rendered))
      .map((city) => ({ name: city.title.rendered, slug: city.slug })),
  }));

await mkdir(join(ROOT, "data"), { recursive: true });
await mkdir(join(ROOT, "archive"), { recursive: true });
await writeFile(join(ROOT, "data", "posts.json"), `${JSON.stringify(normalizedPosts, null, 2)}\n`);
await writeFile(join(ROOT, "data", "service-areas.json"), `${JSON.stringify(counties, null, 2)}\n`);
await writeFile(join(ROOT, "archive", "wordpress-pages.json"), `${JSON.stringify(pages, null, 2)}\n`);
await writeFile(join(ROOT, "archive", "wordpress-media.json"), `${JSON.stringify(media, null, 2)}\n`);

for (const item of media) {
  if (!item.source_url?.startsWith(`${ORIGIN}/wp-content/uploads/`)) continue;
  const relativePath = new URL(item.source_url).pathname.replace(/^\//, "");
  const target = join(ROOT, "public", relativePath);
  await mkdir(dirname(target), { recursive: true });
  const response = await fetch(item.source_url, {
    headers: { "user-agent": "MississippiAppraiserMigration/1.0" },
  });
  if (!response.ok) throw new Error(`${response.status} ${item.source_url}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

console.log(`Archived ${normalizedPosts.length} posts, ${pages.length} pages, and ${media.length} media items.`);
