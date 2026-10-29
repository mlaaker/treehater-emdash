# Post-import fixes

Status 2026-10-29: all of these were applied to production after the import
(see CUTOVER.md); the scripts are kept for a re-import.

## Paragraphs

Classic posts store paragraphs as blank lines, which the WXR import keeps as
one block per post. `migration/split-paragraphs.py` splits them.

## Authors

The import screen mapped both WordPress authors to the admin user. The
"Editor at large, Silas Turncoat" guest byline was re-created by hand and
credited on /and-this-is-how-mankind-will-end/.

Things the WordPress import drops or mangles on this site, found by importing
the real WXR export into a local dev database on 2026-10-29. Check each one
after the import (CUTOVER.md step 6).

## Embeds (raw `<iframe>`/`<embed>` HTML is dropped by the HTML → Portable Text conversion)

`migration/restore-embeds.py` re-adds each as an `iframe` block after the
paragraph it followed on WordPress.

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

## Shortcodes

The WXR keeps shortcodes as literal text (WordPress expands them at render
time). `migration/fix-shortcodes.py` turns `[caption]` into image captions,
`[embed]` into iframe blocks (or drops it when the video is already there),
and repairs the mojibake below. Applied 2026-10-29 (7 posts).

## Encoding

`/snl-irresponsibly-promotes-trees/` and `/call-em-as-you-see-em/` contain
double-encoded text ("weâ€™re") that is already wrong on the live WordPress
site. Repaired by `migration/fix-shortcodes.py` (it also caught `Â` before
non-breaking spaces in three more posts).

## Search the imported content for leftovers

In the admin, search posts and pages for `[` (shortcodes) and `wp:` (block
comments); the local trial found only the Store shortcode.
