# Post-import fixes

Things the WordPress import drops or mangles on this site, found by importing
the real WXR export into a local dev database on 2026-10-29. Check each one
after the import (CUTOVER.md step 6).

## Embeds (raw `<iframe>`/`<embed>` HTML is dropped by the HTML → Portable Text conversion)

Re-add each as an Embed/Iframe block at the same spot in the post.

| Post | Embed | Note |
|---|---|---|
| /espn-boldly-demonstrates-aaa-approved-model-behavior-on-air/ | https://www.espn.com/core/video/iframe?id=17175356&endcard=false | after "...trunked talisman." |
| /snl-irresponsibly-promotes-trees/ | https://www.youtube.com/embed/9V981RXcmH8 | |
| /the-sound-of-sinister/ | https://player.vimeo.com/video/30501143 | |
| /mankinds-resilient-bravery-in-action/ | https://www.youtube.com/embed/xCSHqY07DMQ | |
| /snoop-and-cudi-spread-anti-tree-message-to-the-masses/ | https://www.youtube.com/embed/AcpAPsOr8kg | was a Flash `<embed>` of youtube.com/v/…; use the /embed/ URL |
| /buy-wood-products/ | http://www.hulu.com/embed.html?eid=d7zfb3hhhasxqzm-crtyma | Hulu no longer serves embeds; already blank on WordPress. Skip or replace with a link. |

## Pages

- **/store/** — body is the dead `[amazon_link …]` shortcode. The route
  `src/pages/store.astro` renders the product grid from `src/data/store.ts`
  instead, so the imported body is never shown. Leave it.
- **/about/** (titled "Home") — body is a JavaScript redirect to `/`, which
  is stripped on import. `src/pages/about.ts` 301s to `/` instead.

## Images

`migration/rewrite-upload-urls.sql` points every upload URL (http/https,
www/apex, and one typo'd `wwwr.` host on /let-them-feast-on-their-own-flesh/)
at the Worker's copy in `public/wp-content/uploads/`. Images hotlinked from
other sites (gawker.com, assoc-amazon.com tracking pixels) are left as-is.

## Comments

The WXR import has no comment support. `migration/wxr-comments-to-sql.py`
loads all 18 approved comments (7 regular, 11 Twitter mentions) with their
WordPress ids and threading.

## Encoding

`/snl-irresponsibly-promotes-trees/` and `/call-em-as-you-see-em/` contain
double-encoded text ("weâ€™re") that is already wrong on the live WordPress
site. The import carries it over as-is; fix by hand if wanted (`â€™` → `’`,
`â€œ`/`â€` → `“`/`”`).

## Search the imported content for leftovers

In the admin, search posts and pages for `[` (shortcodes) and `wp:` (block
comments); the local trial found only the Store shortcode.
