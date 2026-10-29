"""
Put back the video embeds that the WXR import drops (raw <iframe>/<embed>
HTML has no Portable Text equivalent). Each becomes an EmDash `iframe` block
inserted after the paragraph that preceded it on WordPress.

Reads the current content from D1, prints SQL; review, then apply:

    python3 -I migration/restore-embeds.py --remote > /tmp/embeds.sql
    npx wrangler d1 execute treehater-emdash-db-v2 --remote --file /tmp/embeds.sql

Re-running is harmless: posts that already have the iframe are skipped.
"""

import json
import subprocess
import sys

DB = "treehater-emdash-db-v2"

# slug -> (embed URL, text from the end of the paragraph before it on WordPress,
#          width, height). "" means the embed opened the post.
EMBEDS = {
    "espn-boldly-demonstrates-aaa-approved-model-behavior-on-air": (
        "https://www.espn.com/core/video/iframe?id=17175356&endcard=false", "trunked talisman.", 640, 360),
    "snl-irresponsibly-promotes-trees": ("https://www.youtube.com/embed/9V981RXcmH8", "video rap.", 640, 360),
    "the-sound-of-sinister": ("https://player.vimeo.com/video/30501143", "Chamber music, it is not.", 640, 360),
    "mankinds-resilient-bravery-in-action": ("https://www.youtube.com/embed/xCSHqY07DMQ", "", 640, 360),
    # Was a Flash <embed> of youtube.com/v/AcpAPsOr8kg.
    "snoop-and-cudi-spread-anti-tree-message-to-the-masses": (
        "https://www.youtube.com/embed/AcpAPsOr8kg", "in the past.", 640, 360),
}


def d1(sql: str):
    where = "--remote" if "--remote" in sys.argv else "--local"
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, where, "--json", "--command", sql],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)[0]["results"]


def block_text(block) -> str:
    return "".join(c.get("text", "") for c in block.get("children", []) if isinstance(c, dict))


def anchor_index(content, slug, after):
    """Where the embed goes: after the paragraph containing `after`, or first."""
    if after == "":
        return 0
    for i, block in enumerate(content):
        if after in block_text(block):
            return i + 1
    sys.exit(f"{slug}: no paragraph containing {after!r}; place this one by hand")


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


for slug, (src, after, width, height) in EMBEDS.items():
    rows = d1(f"SELECT id, content FROM ec_posts WHERE slug = {sql_str(slug)} AND deleted_at IS NULL")
    if not rows:
        sys.exit(f"{slug}: post not found")
    content = json.loads(rows[0]["content"] or "[]")
    if any(b.get("_type") == "iframe" and b.get("src") == src for b in content):
        print(f"-- {slug}: already has {src}")
        continue
    at = anchor_index(content, slug, after)
    content.insert(at, {
        "_type": "iframe",
        "_key": f"wp-embed-{at}",
        "src": src,
        "width": width,
        "height": height,
        "allowFullscreen": True,
        "allow": "autoplay; encrypted-media; fullscreen",
    })
    print(f"-- {slug}: {src} at block {at} of {len(content)}")
    print(f"UPDATE ec_posts SET content = {sql_str(json.dumps(content, ensure_ascii=False))} "
          f"WHERE id = {sql_str(rows[0]['id'])};")
