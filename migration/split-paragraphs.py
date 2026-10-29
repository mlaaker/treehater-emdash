"""
Split imported text blocks into paragraphs. Classic WordPress posts store
paragraphs as blank lines (wpautop adds the <p> tags at render time), and the
WXR import keeps each run of them as one block, so a whole post renders as a
single paragraph. This splits every normal block at "\\n\\n", keeping each
span's marks (links, bold) and the block's markDefs. A lone "\\n" stays in
the text; EmDash renders it as <br>, as wpautop did.

Prints SQL; apply with:

    python3 -I migration/split-paragraphs.py --remote > /tmp/split.sql
    npx wrangler d1 execute treehater-emdash-db-v2 --remote --file /tmp/split.sql

Re-running is harmless: already-split posts produce no UPDATE.
"""

import json
import subprocess
import sys

DB = "treehater-emdash-db-v2"


def d1(sql: str):
    where = "--remote" if "--remote" in sys.argv else "--local"
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, where, "--json", "--command", sql],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)[0]["results"]


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def split_block(block):
    """One normal block -> one block per paragraph. Other blocks pass through."""
    if block.get("_type") != "block" or block.get("style", "normal") != "normal" or block.get("listItem"):
        return [block]
    paragraphs = [[]]
    for span in block.get("children", []):
        text = span.get("text")
        if span.get("_type") != "span" or text is None:
            paragraphs[-1].append(span)
            continue
        for n, piece in enumerate(text.split("\n\n")):
            if n > 0:
                paragraphs.append([])
            if piece:
                paragraphs[-1].append({**span, "text": piece})
    out = []
    for i, children in enumerate(paragraphs):
        # Trim the whitespace left at paragraph edges; drop empty paragraphs.
        while children and children[0].get("_type") == "span" and not children[0]["text"].strip():
            children.pop(0)
        while children and children[-1].get("_type") == "span" and not children[-1]["text"].strip():
            children.pop()
        if not children:
            continue
        if children[0].get("_type") == "span":
            children[0] = {**children[0], "text": children[0]["text"].lstrip()}
        if children[-1].get("_type") == "span":
            children[-1] = {**children[-1], "text": children[-1]["text"].rstrip()}
        keys = {m for c in children for m in c.get("marks", [])}
        out.append({
            **block,
            "_key": block["_key"] if i == 0 else f"{block['_key']}-p{i}",
            "children": [{**c, "_key": f"{c.get('_key', 'k')}-{i}"} if i else c for c in children],
            "markDefs": [d for d in block.get("markDefs", []) if d.get("_key") in keys],
        })
    return out or [block]


for collection in ("posts", "pages"):
    for row in d1(f"SELECT id, slug, content FROM ec_{collection} WHERE deleted_at IS NULL"):
        content = json.loads(row["content"] or "[]")
        split = [b for block in content for b in split_block(block)]
        if json.dumps(split) == json.dumps(content):
            continue
        print(f"-- {collection}/{row['slug']}: {len(content)} -> {len(split)} blocks")
        print(f"UPDATE ec_{collection} SET content = {sql_str(json.dumps(split, ensure_ascii=False))} "
              f"WHERE id = {sql_str(row['id'])};")
