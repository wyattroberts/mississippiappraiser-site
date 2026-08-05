import { NextRequest, NextResponse } from "next/server";
import type { Post } from "@/lib/content";
import { isAdmin, sameOrigin } from "@/lib/admin-auth";
import { readPostsFile, writePostsFile } from "@/lib/github-content";
import { cleanList, sanitizePostHtml, slugify } from "@/lib/post-sanitize";

function unauthorized() {
  return NextResponse.json({ error: "Sign in required" }, { status: 401 });
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Unable to update posts";
}

function dateValue(value: unknown) {
  const raw = String(value || "").trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00-05:00` : raw;
  return Number.isNaN(new Date(normalized).getTime()) ? "" : normalized;
}

function postPath(date: string, slug: string) {
  const parsed = new Date(date);
  return `/${parsed.getUTCFullYear()}/${String(parsed.getUTCMonth() + 1).padStart(2, "0")}/${slug}/`;
}

export async function GET(request: NextRequest) {
  if (!await isAdmin(request)) return unauthorized();
  try {
    const { posts } = await readPostsFile();
    return NextResponse.json({ posts: posts.sort((a, b) => new Date(b.modified || b.date).getTime() - new Date(a.modified || a.date).getTime()) });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!await isAdmin(request)) return unauthorized();
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = String(payload.title || "").trim().slice(0, 180);
  const slug = slugify(String(payload.slug || title));
  const date = dateValue(payload.date);
  const content = sanitizePostHtml(String(payload.content || ""));
  const requestedStatus = String(payload.status || "draft");
  const status: Post["status"] = requestedStatus === "published" ? "published" : "draft";

  if (!title || !slug || !date || !content) {
    return NextResponse.json({ error: "Title, date, URL slug, and article content are required." }, { status: 400 });
  }

  try {
    const { posts, sha } = await readPostsFile();
    const requestedId = Number(payload.id);
    const existingIndex = Number.isFinite(requestedId) ? posts.findIndex((post) => post.id === requestedId) : -1;
    const duplicate = posts.find((post, index) => post.slug === slug && index !== existingIndex);
    if (duplicate) return NextResponse.json({ error: "That URL slug is already used by another post." }, { status: 409 });

    const now = new Date().toISOString();
    const existing = existingIndex >= 0 ? posts[existingIndex] : undefined;
    const id = existing?.id ?? Math.max(Date.now(), ...posts.map((post) => (Number(post.id) || 0) + 1));
    const excerpt = String(payload.excerpt || "").trim().slice(0, 600);
    const featuredImage = String(payload.featuredImage || "").trim() || null;
    const featuredImageAlt = String(payload.featuredImageAlt || "").trim().slice(0, 240);
    if (featuredImage && !featuredImage.startsWith("/") && !/^https:\/\//i.test(featuredImage)) {
      return NextResponse.json({ error: "Featured image must use a site path or an HTTPS URL." }, { status: 400 });
    }
    if (status === "published" && featuredImage && !featuredImageAlt) {
      return NextResponse.json({ error: "Add alt text describing the featured image before publishing." }, { status: 400 });
    }

    const post: Post = {
      id,
      date,
      modified: now,
      slug,
      title,
      excerpt,
      content,
      categories: cleanList(payload.categories, 8),
      tags: cleanList(payload.tags, 20),
      featuredImage,
      featuredImageAlt,
      seoTitle: String(payload.seoTitle || "").trim().slice(0, 70),
      seoDescription: String(payload.seoDescription || "").trim().slice(0, 170),
      status,
      originalUrl: `https://mississippiappraiser.com${postPath(date, slug)}`,
    };

    if (existingIndex >= 0) posts[existingIndex] = post;
    else posts.push(post);
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const action = status === "published" ? "Publish" : "Save draft";
    const result = await writePostsFile(posts, sha, `${action}: ${title}`);
    return NextResponse.json({ post, posts, commitUrl: result.commit.html_url, deploymentPending: true });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!await isAdmin(request)) return unauthorized();
  const payload = await request.json().catch(() => ({})) as { id?: unknown };
  const id = Number(payload.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid post" }, { status: 400 });
  try {
    const { posts, sha } = await readPostsFile();
    const index = posts.findIndex((post) => post.id === id);
    if (index < 0) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const post = { ...posts[index], status: "archived" as const, modified: new Date().toISOString() };
    posts[index] = post;
    const result = await writePostsFile(posts, sha, `Archive: ${post.title}`);
    return NextResponse.json({ post, posts, commitUrl: result.commit.html_url, deploymentPending: true });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 502 });
  }
}
