import { NextRequest, NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/admin-auth";
import { uploadBlogImage } from "@/lib/spaces";

const types = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!await isAdmin(request)) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  const label = String(form?.get("label") || "blog-image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (!types.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP, or GIF image." }, { status: 400 });
  if (file.size > 15_000_000) return NextResponse.json({ error: "Images must be smaller than 15 MB." }, { status: 400 });

  try {
    const result = await uploadBlogImage(file, label);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload image" }, { status: 502 });
  }
}
