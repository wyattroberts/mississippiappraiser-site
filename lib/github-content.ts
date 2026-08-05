import type { Post } from "@/lib/content";

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

function githubFailure(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new Error("GitHub did not respond in time. Please try again.");
  }
  return error instanceof Error ? error : new Error("Unable to contact GitHub. Please try again.");
}

async function github(path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const { token, repository } = settings();
  const method = String(init.method || "GET").toUpperCase();
  const mayRetry = method === "GET" && attempt === 0;
  let response: Response;
  try {
    response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(method === "GET" ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS),
    });
  } catch (error) {
    if (mayRetry) return github(path, init, attempt + 1);
    throw githubFailure(error);
  }
  if (mayRetry && [502, 503, 504].includes(response.status)) {
    return github(path, init, attempt + 1);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(error.message || `GitHub returned ${response.status}`);
  }
  return response;
}

export async function readPostsFile() {
  const { branch } = settings();
  const response = await github(`contents/data/posts.json?ref=${encodeURIComponent(branch)}`);
  const file = await response.json() as GitHubFile;
  if (file.encoding !== "base64") throw new Error("Unexpected GitHub content encoding");
  return { posts: JSON.parse(base64ToUtf8(file.content)) as Post[], sha: file.sha };
}

export async function writePostsFile(posts: Post[], sha: string, message: string) {
  const { branch } = settings();
  const response = await github("contents/data/posts.json", {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: utf8ToBase64(`${JSON.stringify(posts, null, 2)}\n`),
      sha,
      branch,
    }),
  });
  return response.json() as Promise<{ commit: { html_url: string; sha: string } }>;
}

export async function uploadBlogImage(path: string, bytes: Uint8Array, message: string) {
  const { branch } = settings();
  const response = await github(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: bytesToBase64(bytes), branch }),
  });
  return response.json() as Promise<{ commit: { html_url: string; sha: string } }>;
}
