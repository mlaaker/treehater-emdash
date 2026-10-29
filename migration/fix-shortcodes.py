"""
Clean up WordPress leftovers that the WXR import keeps as literal text:

- [caption ...]<image>...[/caption]: the shortcode text sits in its own blocks
  around the image block. The caption (the shortcode's caption="" attribute,
  or the text before [/caption]) moves onto the image block and the
  shortcode text is removed.
- [embed]URL[/embed]: becomes an iframe block for YouTube URLs, or is removed
  when the post already has that video (restore-embeds.py may have added it).
- Mojibake ("weâ€™re"): text that was UTF-8 decoded as Windows-1252 in
  WordPress's database, already wrong on the old site. Repaired by reversing
  that decode.

The Store page's [amazon_link] is left alone: src/pages/store.astro never
renders that body.

Prints SQL; apply with:

    python3 -I migration/fix-shortcodes.py --remote > /tmp/shortcodes.sql
    npx wrangler d1 execute treehater-emdash-db-v2 --remote --file /tmp/shortcodes.sql

Re-running is harmless: fixed content produces no UPDATE.
"""

import json
import re
import subprocess
import sys

DB = "treehater-emdash-db-v2"
CAPTION_OPEN = re.compile(r"\[caption\b([^\]]*)\]")
CAPTION_CLOSE = "[/caption]"
EMBED = re.compile(r"\[embed\b[^\]]*\]\s*(\S+?)\s*\[/embed\]")
YOUTUBE_ID = re.compile(r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|v/))([\w-]{11})")
MOJIBAKE = re.compile("[ÂÃâ][\u0080-¿‐-›€™ŒœŠšŸŽžƒˆ˜]")


def d1(sql: str):
    where = "--remote" if "--remote" in sys.argv else "--local"
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, where, "--json", "--command", sql],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)[0]["results"]


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def text_of(block) -> str:
    return "".join(c.get("text", "") for c in block.get("children", []) if isinstance(c, dict))


def demojibake(text: str) -> str:
    """Undo UTF-8 read as Windows-1252, one mangled run at a time."""
    if not MOJIBAKE.search(text):
        return text

    def fix(m):
        try:
            return m.group(0).encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return m.group(0)

    return re.sub("[Â-ô][\u0080-¿Œ-™]{1,3}", fix, text)


def fix_text(block):
    if block.get("_type") != "block":
        return block
    children = [{**c, "text": demojibake(c["text"])} if c.get("_type") == "span" else c
                for c in block.get("children", [])]
    return {**block, "children": children}


def fix_content(content):
    content = [fix_text(b) for b in content]
    videos = {m.group(1) for b in content if b.get("_type") == "iframe"
              for m in [YOUTUBE_ID.search(b.get("src", ""))] if m}
    out = []
    i = 0
    while i < len(content):
        block = content[i]
        text = text_of(block).strip()
        opening = CAPTION_OPEN.fullmatch(text) if block.get("_type") == "block" else None
        if opening and i + 1 < len(content) and content[i + 1].get("_type") == "image":
            image = dict(content[i + 1])
            attr = re.search(r'caption="([^"]*)"', opening.group(1))
            caption = attr.group(1) if attr else ""
            i += 2
            # The closing block holds "[/caption]", optionally preceded by the caption text.
            if i < len(content) and text_of(content[i]).strip().endswith(CAPTION_CLOSE):
                trailing = text_of(content[i]).strip()[: -len(CAPTION_CLOSE)].strip()
                caption = caption or trailing
                i += 1
            if caption:
                image["caption"] = caption
            out.append(image)
            continue
        embed = EMBED.fullmatch(text) if block.get("_type") == "block" else None
        if embed:
            video = YOUTUBE_ID.search(embed.group(1))
            if video and video.group(1) not in videos:
                out.append({
                    "_type": "iframe", "_key": f"{block['_key']}-embed",
                    "src": f"https://www.youtube.com/embed/{video.group(1)}",
                    "width": 640, "height": 360, "allowFullscreen": True,
                    "allow": "autoplay; encrypted-media; fullscreen",
                })
                videos.add(video.group(1))
            i += 1
            continue
        out.append(block)
        i += 1
    return out


for collection in ("posts", "pages"):
    for row in d1(f"SELECT id, slug, content FROM ec_{collection} WHERE deleted_at IS NULL"):
        if row["slug"] == "store":
            continue
        content = json.loads(row["content"] or "[]")
        fixed = fix_content(content)
        if json.dumps(fixed, ensure_ascii=False) == json.dumps(content, ensure_ascii=False):
            continue
        print(f"-- {collection}/{row['slug']}: {len(content)} -> {len(fixed)} blocks")
        print(f"UPDATE ec_{collection} SET content = {sql_str(json.dumps(fixed, ensure_ascii=False))} "
              f"WHERE id = {sql_str(row['id'])};")
