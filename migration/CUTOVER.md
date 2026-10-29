# treehater.com cutover runbook

WordPress may go down during this (decided 2026-10-29), so the import runs on
www after the switch, from files already in hand. Rehearsed end to end on a
local database on 2026-10-29: 26 published + 11 draft posts, 4 pages, 11
media, 18 comments, all 84 URLs in `redirect-check.txt` resolving.

## Already extracted from WordPress

| What | Where |
|---|---|
| Content (WXR, all content incl. drafts and comments) | `~/Downloads/anti-arborealassociation.WordPress.2026-10-29.xml` (not in git: has commenter emails) |
| Every upload and its resized copies (39 files) | `public/wp-content/uploads/`, same paths, served by the Worker |
| Logo and favicon | `public/aaa-logo.png`, `public/favicon.png` |
| Menu, footer widgets, title, tagline | `seed/seed.json` |
| Store products | `src/data/store.ts` |
| Design | `public/twentytwenty/`, `migration/reference/` |

Optional before switching: a full DreamHost backup (files + database) for the
archive. Nothing below depends on it.

## Steps

1. **Deploy** the branch: `pnpm build && npx wrangler deploy --secrets-file .env`
2. **Attach the domains** (WordPress stops serving here): Worker
   `treehater-emdash` → Settings → Domains & Routes → Add → Custom domain →
   `www.treehater.com`, then `treehater.com`. Cloudflare replaces the
   DreamHost A records; mail (Google MX/TXT) is untouched.
3. **Create the admin** at `https://www.treehater.com/_emdash/admin`: the
   setup wizard applies the seed; register the passkey here (it is bound to
   www, never workers.dev).
4. **Import**: Admin → Import → upload the WXR → Review (post → posts, page →
   pages; map `notreesfebreeze` to your user, leave `silas` as a guest byline)
   → Import → Copy media. Media copies from `/wp-content/uploads/` on the
   Worker itself. **This fails with HTTP 522** (a Worker can't fetch its own
   hostname); skip it. Posts use the uploads at their old paths and don't
   need the media library.
5. **Database fixes** (Claude runs these):
   ```
   npx wrangler d1 execute treehater-emdash-db-v2 --remote --file migration/rewrite-upload-urls.sql
   python3 -I migration/wxr-comments-to-sql.py ~/Downloads/anti-arborealassociation.WordPress.2026-10-29.xml > migration/comments.sql
   npx wrangler d1 execute treehater-emdash-db-v2 --remote --file migration/comments.sql
   ```
6. **Paragraphs, embeds, bylines**:
   ```
   python3 -I migration/split-paragraphs.py --remote > /tmp/split.sql
   npx wrangler d1 execute treehater-emdash-db-v2 --remote --file /tmp/split.sql
   python3 -I migration/restore-embeds.py --remote > /tmp/embeds.sql
   npx wrangler d1 execute treehater-emdash-db-v2 --remote --file /tmp/embeds.sql
   python3 -I migration/fix-shortcodes.py --remote > /tmp/shortcodes.sql
   npx wrangler d1 execute treehater-emdash-db-v2 --remote --file /tmp/shortcodes.sql
   ```
   then the rest of `migration/post-import-fixes.md`.
7. **Verify**: every URL in `redirect-check.txt` against www returns 200/301,
   images load, comments show, drafts 404.

Done 2026-10-29: domains attached 14:18:55; import, fixes and verification
finished the same afternoon (84/84 URLs).

## Rollback

Remove both custom domains from the Worker and restore the A records for
`treehater.com` and `www.treehater.com` to DreamHost `69.163.180.110`
(DNS-only, as before). WordPress files are untouched at DreamHost.
