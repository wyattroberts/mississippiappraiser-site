import { NextRequest, NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/admin-auth";
import { uploadBlogImage } from "@/lib/github-content";
import { slugify } from "@/lib/post-sanitize";

const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!await isAdmin(request)) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  const label = String(form?.get("label") || "blog-image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  const extension = types[file.type];
  if (!extension) return NextResponse.json({ error: "Use a JPG, PNG, WebP, or GIF image." }, { status: 400 });
  if (file.size > 5_000_000) return NextResponse.json({ error: "Images must be smaller than 5 MB." }, { status: 400 });

  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const name = `${slugify(label || file.name) || "blog-image"}-${Date.now()}.${extension}`;
  const repositoryPath = `public/uploads/blog/${folder}/${name}`;
  try {
    const result = await uploadBlogImage(repositoryPath, new Uint8Array(await file.arrayBuffer()), `Upload blog image: ${name}`);
    return NextResponse.json({ path: `/${repositoryPath.replace(/^public\//, "")}`, commitUrl: result.commit.html_url, deploymentPending: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload image" }, { status: 502 });
  }
}
