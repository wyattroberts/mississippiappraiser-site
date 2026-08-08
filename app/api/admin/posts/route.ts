import { NextRequest, NextResponse } from "next/server";
import type { Post } from "@/lib/content";
import { isAdmin, sameOrigin } from "@/lib/admin-auth";
import { archivePost, getAllPosts, nextPostId, savePost } from "@/lib/blog-db";
import { cleanList, sanitizePostHtml, slugify } from "@/lib/post-sanitize";
import { backupBlogPosts, spacesConfigured } from "@/lib/spaces";

function unauthorized() {
  return NextResponse.json({ error: "Sign in required" }, { status: 401 });
}

function message(error: unknown) {
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return "That URL slug is already used by another post.";
  }
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
  return NextResponse.json({
    posts: await getAllPosts(),
  });
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
    const posts = await getAllPosts();
    const requestedId = Number(payload.id);
    const existing = Number.isFinite(requestedId) ? posts.find((post) => post.id === requestedId) : undefined;
    const duplicate = posts.find((post) => post.slug === slug && post.id !== existing?.id);
    if (duplicate) return NextResponse.json({ error: "That URL slug is already used by another post." }, { status: 409 });

    const now = new Date().toISOString();
    const id = existing?.id ?? await nextPostId();
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

    const savedPost = await savePost(post);
    const updatedPosts = await getAllPosts();
    let backupWarning = "";
    if (spacesConfigured()) {
      try {
        await backupBlogPosts(updatedPosts);
      } catch {
        backupWarning = "The post was saved, but its Spaces backup could not be updated.";
      }
    }
    return NextResponse.json({ post: savedPost, posts: updatedPosts, backupWarning });
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
    const post = await archivePost(id);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const posts = await getAllPosts();
    let backupWarning = "";
    if (spacesConfigured()) {
      try {
        await backupBlogPosts(posts);
      } catch {
        backupWarning = "The post was archived, but its Spaces backup could not be updated.";
      }
    }
    return NextResponse.json({ post, posts, backupWarning });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 502 });
  }
}
