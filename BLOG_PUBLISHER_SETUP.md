# Mississippi Appraiser blog publisher setup

The publisher is available at `/admin/blog/`. It stores posts and uploaded images in this repository; the existing DigitalOcean auto-deploy then publishes the updated site. No database is required.

## 1. Create the GitHub publishing token

In GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens** and create a token with:

- Repository access: **Only select repositories → mississippiappraiser-site**
- Repository permission: **Contents → Read and write**
- No other write permissions

Copy the token when GitHub displays it. Do not save it in this repository.

## 2. Add protected DigitalOcean settings

Open the DigitalOcean app, select **Settings → App-Level Environment Variables**, and add:

| Name | Value | Protection |
|---|---|---|
| `BLOG_ADMIN_PASSWORD` | A long, unique publisher password | Encrypt |
| `BLOG_SESSION_SECRET` | Output from `openssl rand -hex 32` | Encrypt |
| `BLOG_GITHUB_TOKEN` | The fine-grained GitHub token | Encrypt |
| `BLOG_GITHUB_REPOSITORY` | `wyattroberts/mississippiappraiser-site` | Plain text is acceptable |
| `BLOG_GITHUB_BRANCH` | `main` | Plain text is acceptable |

Use **Run Time** scope if DigitalOcean asks for a scope. Save the settings and allow the app to redeploy.

## 3. Open the publisher

Visit `https://mississippiappraiser.com/admin/blog/` and sign in with `BLOG_ADMIN_PASSWORD`.

Publishing or uploading an image creates a revision in GitHub. DigitalOcean then rebuilds the public site automatically. Draft posts remain absent from the public blog, sitemap, and RSS feed.
