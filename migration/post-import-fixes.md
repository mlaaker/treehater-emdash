# Post-import fixes

Things the WordPress import is known to drop or mangle on this site, found by
importing a REST-built WXR into a local dev database on 2026-10-29. Check each
one after the real exporter import (Phase 4) and fix in the EmDash admin.

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

## Encoding

`/snl-irresponsibly-promotes-trees/` and `/call-em-as-you-see-em/` contain
double-encoded text ("weâ€™re") that is already wrong on the live WordPress
site. The import carries it over as-is; fix by hand if wanted (`â€™` → `’`,
`â€œ`/`â€` → `“`/`”`).

## Search the imported content for leftovers

In the admin, search posts and pages for `[` (shortcodes) and `wp:` (block
comments); the local trial found only the Store shortcode.
