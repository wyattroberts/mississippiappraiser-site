import type { Post } from "@/lib/content";
import { request as httpsRequest } from "node:https";

type GitHubFile = { content: string; encoding: string; sha: string };

function settings() {
  const token = process.env.BLOG_GITHUB_TOKEN;
  const repository = process.env.BLOG_GITHUB_REPOSITORY || "wyattroberts/mississippiappraiser-site";
  const branch = process.env.BLOG_GITHUB_BRANCH || "main";
  if (!token) throw new Error("BLOG_GITHUB_TOKEN is not configured");
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("BLOG_GITHUB_REPOSITORY is invalid");
  return { token, repository, branch };
}

function bytesToBase64(bytes: Uint8Array) {
  let result = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(result);
}

function utf8ToBase64(value: string) {
  return bytesToBase64(new TextEncoder().encode(value));
}

function base64ToUtf8(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

const READ_TIMEOUT_MS = 8_000;
const WRITE_TIMEOUT_MS = 20_000;

type GitHubRequest = { method?: "GET" | "PUT"; body?: string };

function github<T>(path: string, init: GitHubRequest = {}, attempt = 0): Promise<T> {
  const { token, repository } = settings();
  const method = init.method || "GET";
  const mayRetry = method === "GET" && attempt === 0;
  const timeout = method === "GET" ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS;

  return new Promise<T>((resolve, reject) => {
    const request = httpsRequest({
      protocol: "https:",
      hostname: "api.github.com",
      port: 443,
      path: `/repos/${repository}/${path}`,
      method,
      family: 4,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "mississippiappraiser-blog-publisher",
        ...(init.body ? { "Content-Length": Buffer.byteLength(init.body) } : {}),
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        const status = response.statusCode || 500;
        const text = Buffer.concat(chunks).toString("utf8");
        let payload: T & { message?: string };
        try {
          payload = JSON.parse(text) as T & { message?: string };
        } catch {
          payload = {} as T & { message?: string };
        }
        if (status >= 200 && status < 300) {
          resolve(payload);
          return;
        }
        if (mayRetry && [502, 503, 504].includes(status)) {
          void github<T>(path, init, attempt + 1).then(resolve, reject);
          return;
        }
        reject(new Error(payload.message || `GitHub returned ${status}`));
      });
    });

    request.setTimeout(timeout, () => request.destroy(new Error("GitHub did not respond in time. Please try again.")));
    request.on("error", (error) => {
      if (mayRetry) {
        void github<T>(path, init, attempt + 1).then(resolve, reject);
        return;
      }
      reject(error);
    });
    if (init.body) request.write(init.body);
    request.end();
  });
}

export async function readPostsFile() {
  const { branch } = settings();
  const file = await github<GitHubFile>(`contents/data/posts.json?ref=${encodeURIComponent(branch)}`);
  if (file.encoding !== "base64") throw new Error("Unexpected GitHub content encoding");
  return { posts: JSON.parse(base64ToUtf8(file.content)) as Post[], sha: file.sha };
}

export async function writePostsFile(posts: Post[], sha: string, message: string) {
  const { branch } = settings();
  return github<{ commit: { html_url: string; sha: string } }>("contents/data/posts.json", {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: utf8ToBase64(`${JSON.stringify(posts, null, 2)}\n`),
      sha,
      branch,
    }),
  });
}

export async function uploadBlogImage(path: string, bytes: Uint8Array, message: string) {
  const { branch } = settings();
  return github<{ commit: { html_url: string; sha: string } }>(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: bytesToBase64(bytes), branch }),
  });
}
