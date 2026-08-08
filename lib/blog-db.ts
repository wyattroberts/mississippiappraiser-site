import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { legacyAllPosts, type Post } from "@/lib/content";

type BlogDatabaseGlobal = typeof globalThis & {
  mississippiAppraiserPool?: Pool;
  mississippiAppraiserSchema?: Promise<void>;
};

const databaseGlobal = globalThis as BlogDatabaseGlobal;

function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

function getPool() {
  if (!databaseUrl()) throw new Error("DATABASE_URL is not configured");
  if (!databaseGlobal.mississippiAppraiserPool) {
    databaseGlobal.mississippiAppraiserPool = new Pool({
      connectionString: databaseUrl(),
      max: 6,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return databaseGlobal.mississippiAppraiserPool;
}

async function insertPost(client: PoolClient, post: Post) {
  await client.query(`
    INSERT INTO blog_posts (
      id, date, modified, slug, title, excerpt, content, categories, tags,
      featured_image, featured_image_alt, seo_title, seo_description, status, original_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb,
      $10, $11, $12, $13, $14, $15
    )
    ON CONFLICT (id) DO NOTHING
  `, [
    post.id,
    post.date,
    post.modified,
    post.slug,
    post.title,
    post.excerpt,
    post.content,
    JSON.stringify(post.categories),
    JSON.stringify(post.tags || []),
    post.featuredImage,
    post.featuredImageAlt || "",
    post.seoTitle || "",
    post.seoDescription || "",
    post.status,
    post.originalUrl,
  ]);
}

async function initializeSchema() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id BIGINT PRIMARY KEY,
        date TIMESTAMPTZ NOT NULL,
        modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        slug VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(180) NOT NULL,
        excerpt TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        featured_image TEXT,
        featured_image_alt VARCHAR(240) NOT NULL DEFAULT '',
        seo_title VARCHAR(70) NOT NULL DEFAULT '',
        seo_description VARCHAR(170) NOT NULL DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        original_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS blog_posts_public_date_idx ON blog_posts (status, date DESC)");

    await client.query("BEGIN");
    await client.query("LOCK TABLE blog_posts IN SHARE ROW EXCLUSIVE MODE");
    const count = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM blog_posts");
    if (Number(count.rows[0]?.count || 0) === 0) {
      for (const post of legacyAllPosts) await insertPost(client, post);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  if (!databaseUrl()) return;
  if (!databaseGlobal.mississippiAppraiserSchema) {
    databaseGlobal.mississippiAppraiserSchema = initializeSchema().catch((error) => {
      databaseGlobal.mississippiAppraiserSchema = undefined;
      throw error;
    });
  }
  await databaseGlobal.mississippiAppraiserSchema;
}

type PostRow = QueryResultRow & {
  id: string;
  date: Date | string;
  modified: Date | string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  categories: string[];
  tags: string[];
  featured_image: string | null;
  featured_image_alt: string;
  seo_title: string;
  seo_description: string;
  status: Post["status"];
  original_url: string;
};

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToPost(row: PostRow): Post {
  return {
    id: Number(row.id),
    date: iso(row.date),
    modified: iso(row.modified),
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    categories: Array.isArray(row.categories) ? row.categories : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    featuredImage: row.featured_image,
    featuredImageAlt: row.featured_image_alt,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status,
    originalUrl: row.original_url,
  };
}

const columns = `
  id, date, modified, slug, title, excerpt, content, categories, tags,
  featured_image, featured_image_alt, seo_title, seo_description, status, original_url
`;

export function blogDatabaseConfigured() {
  return Boolean(databaseUrl());
}

export async function getAllPosts() {
  if (!databaseUrl()) return [...legacyAllPosts].sort((a, b) => new Date(b.modified || b.date).getTime() - new Date(a.modified || a.date).getTime());
  await ensureSchema();
  const result = await getPool().query<PostRow>(`SELECT ${columns} FROM blog_posts ORDER BY modified DESC`);
  return result.rows.map(rowToPost);
}

export async function getPublishedPosts(limit?: number) {
  if (!databaseUrl()) {
    const posts = legacyAllPosts.filter((post) => post.status === "published").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return typeof limit === "number" ? posts.slice(0, limit) : posts;
  }
  await ensureSchema();
  const values: unknown[] = [];
  const limitSql = typeof limit === "number" ? " LIMIT $1" : "";
  if (typeof limit === "number") values.push(limit);
  const result = await getPool().query<PostRow>(`SELECT ${columns} FROM blog_posts WHERE status = 'published' ORDER BY date DESC${limitSql}`, values);
  return result.rows.map(rowToPost);
}

export async function findPublishedPost(year: string, month: string, slug: string) {
  if (!databaseUrl()) {
    return legacyAllPosts.find((post) => post.status === "published" && post.slug === slug && post.date.slice(0, 7) === `${year}-${month}`);
  }
  await ensureSchema();
  const result = await getPool().query<PostRow>(`
    SELECT ${columns}
    FROM blog_posts
    WHERE status = 'published'
      AND slug = $1
      AND EXTRACT(YEAR FROM date AT TIME ZONE 'America/Chicago') = $2
      AND EXTRACT(MONTH FROM date AT TIME ZONE 'America/Chicago') = $3
    LIMIT 1
  `, [slug, Number(year), Number(month)]);
  return result.rows[0] ? rowToPost(result.rows[0]) : undefined;
}

export async function savePost(post: Post) {
  if (!databaseUrl()) throw new Error("DATABASE_URL is not configured");
  await ensureSchema();
  const result = await getPool().query<PostRow>(`
    INSERT INTO blog_posts (
      id, date, modified, slug, title, excerpt, content, categories, tags,
      featured_image, featured_image_alt, seo_title, seo_description, status, original_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb,
      $10, $11, $12, $13, $14, $15
    )
    ON CONFLICT (id) DO UPDATE SET
      date = EXCLUDED.date,
      modified = EXCLUDED.modified,
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      excerpt = EXCLUDED.excerpt,
      content = EXCLUDED.content,
      categories = EXCLUDED.categories,
      tags = EXCLUDED.tags,
      featured_image = EXCLUDED.featured_image,
      featured_image_alt = EXCLUDED.featured_image_alt,
      seo_title = EXCLUDED.seo_title,
      seo_description = EXCLUDED.seo_description,
      status = EXCLUDED.status,
      original_url = EXCLUDED.original_url
    RETURNING ${columns}
  `, [
    post.id,
    post.date,
    post.modified,
    post.slug,
    post.title,
    post.excerpt,
    post.content,
    JSON.stringify(post.categories),
    JSON.stringify(post.tags || []),
    post.featuredImage,
    post.featuredImageAlt || "",
    post.seoTitle || "",
    post.seoDescription || "",
    post.status,
    post.originalUrl,
  ]);
  return rowToPost(result.rows[0]);
}

export async function nextPostId() {
  if (!databaseUrl()) return Date.now();
  await ensureSchema();
  const result = await getPool().query<{ maximum: string | null }>("SELECT MAX(id)::text AS maximum FROM blog_posts");
  return Math.max(Date.now(), Number(result.rows[0]?.maximum || 0) + 1);
}

export async function archivePost(id: number) {
  if (!databaseUrl()) throw new Error("DATABASE_URL is not configured");
  await ensureSchema();
  const result = await getPool().query<PostRow>(`
    UPDATE blog_posts
    SET status = 'archived', modified = NOW()
    WHERE id = $1
    RETURNING ${columns}
  `, [id]);
  return result.rows[0] ? rowToPost(result.rows[0]) : undefined;
}
