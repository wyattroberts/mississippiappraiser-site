import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import type { Post } from "@/lib/content";
import { slugify } from "@/lib/post-sanitize";

type SpacesSettings = {
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function settings(): SpacesSettings {
  const result = {
    bucket: process.env.SPACES_BUCKET?.trim() || "",
    endpoint: process.env.SPACES_ENDPOINT?.trim() || "",
    publicBaseUrl: process.env.SPACES_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || "",
    region: process.env.SPACES_REGION?.trim() || "",
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID?.trim() || "",
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY?.trim() || "",
  };
  if (Object.values(result).some((value) => !value)) throw new Error("Spaces storage is not fully configured");
  return result;
}

function client(config: SpacesSettings) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

export function spacesConfigured() {
  try {
    settings();
    return true;
  } catch {
    return false;
  }
}

export async function uploadBlogImage(file: File, label: string) {
  const config = settings();
  const input = Buffer.from(await file.arrayBuffer());
  const isAnimatedGif = file.type === "image/gif";
  let body = input;
  let contentType = file.type;
  let extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
  let width: number | undefined;
  let height: number | undefined;

  if (!isAnimatedGif) {
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    body = optimized.data;
    contentType = "image/webp";
    extension = "webp";
    width = optimized.info.width;
    height = optimized.info.height;
  } else {
    const metadata = await sharp(input, { animated: true }).metadata();
    width = metadata.width;
    height = metadata.pageHeight || metadata.height;
  }

  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const name = `${slugify(label || file.name) || "blog-image"}-${Date.now()}.${extension}`;
  const key = `blog/${folder}/${name}`;
  await client(config).send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ACL: "public-read",
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return {
    path: `${config.publicBaseUrl}/${key}`,
    bytes: body.byteLength,
    width,
    height,
  };
}

export async function backupBlogPosts(posts: Post[]) {
  const config = settings();
  const body = `${JSON.stringify(posts, null, 2)}\n`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storage = client(config);
  const upload = (key: string) => storage.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: "application/json; charset=utf-8",
    CacheControl: "no-store",
  }));
  await Promise.all([
    upload("backups/posts/latest.json"),
    upload(`backups/posts/${timestamp}.json`),
  ]);
}
