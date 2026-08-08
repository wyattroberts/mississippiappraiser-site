# Mississippi Appraiser blog publisher setup

The publisher is available at `/admin/blog/`. Posts are stored in PostgreSQL and images are stored in DigitalOcean Spaces. Saving or publishing content does not modify GitHub and does not deploy the application.

## DigitalOcean components

- An attached PostgreSQL database supplies `DATABASE_URL` at runtime.
- The `mississippi-appraiser-media` Space stores optimized public images.
- Every post change also creates a private JSON backup under `backups/posts/` in the Space.

## Protected DigitalOcean settings

Add these to the web service with Runtime scope and encryption enabled:

| Name | Purpose |
|---|---|
| `BLOG_ADMIN_PASSWORD` | Publisher sign-in password |
| `BLOG_SESSION_SECRET` | HMAC secret for publisher sessions |
| `SPACES_ACCESS_KEY_ID` | Limited-access Spaces key ID |
| `SPACES_SECRET_ACCESS_KEY` | Limited-access Spaces secret key |

The Spaces key should have Read/Write/Delete access only to `mississippi-appraiser-media`.

## Non-secret DigitalOcean settings

Add these to the web service with Runtime scope:

| Name | Value |
|---|---|
| `SPACES_BUCKET` | `mississippi-appraiser-media` |
| `SPACES_REGION` | `nyc3` |
| `SPACES_ENDPOINT` | `https://nyc3.digitaloceanspaces.com` |
| `SPACES_PUBLIC_BASE_URL` | `https://mississippi-appraiser-media.nyc3.digitaloceanspaces.com` |

## First deployment

On the first request after deployment, the application creates the `blog_posts` table and imports the legacy posts from `data/posts.json` if the table is empty. Later requests read PostgreSQL directly. The JSON file remains only as a first-deployment seed and recovery source.

Still images are automatically rotated, resized to fit within 2000 by 2000 pixels without enlargement, and converted to WebP. Animated GIFs are retained as GIFs. Public article pages show the complete featured image at its natural aspect ratio; compact blog cards use a cropped thumbnail treatment.
