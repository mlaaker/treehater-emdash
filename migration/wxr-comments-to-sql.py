"""
Turn the approved comments in a WordPress WXR export into SQL for EmDash's
_emdash_comments table. EmDash's WXR import doesn't bring comments over;
run this after the content import, then apply the output with:

    npx wrangler d1 execute treehater-emdash-db-v2 --remote --file migration/comments.sql

Comment ids keep their WordPress numbers, so old #comment-123 anchors still
land. Posts are matched by slug at insert time. INSERT OR IGNORE makes a
re-run harmless.

Usage: python3 -I migration/wxr-comments-to-sql.py export.xml > migration/comments.sql
"""

import html
import re
import sys
import xml.etree.ElementTree as ET

NS = {"wp": "http://wordpress.org/export/1.2/"}


def text(el, tag):
    found = el.find(tag, NS)
    return (found.text or "") if found is not None else ""


def plain(body: str) -> str:
    """WordPress stored comment HTML; EmDash comments are plain text."""

    def link(m):
        href, label = m.group(1), re.sub(r"<[^>]+>", "", m.group(2))
        return label if label.strip() == href.strip() else f"{label} ({href})"

    body = re.sub(r'<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>', link, body, flags=re.S | re.I)
    body = re.sub(r"<br\s*/?>", "\n", body, flags=re.I)
    body = re.sub(r"</p>\s*<p[^>]*>", "\n\n", body, flags=re.I)
    body = re.sub(r"<[^>]+>", "", body)
    return html.unescape(body).strip()


def sql(value) -> str:
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def iso(gmt: str) -> str:
    return gmt.replace(" ", "T") + "Z"


rows = []
for item in ET.parse(sys.argv[1]).getroot().iter("item"):
    if text(item, "wp:post_type") != "post":
        continue
    slug = text(item, "wp:post_name")
    for c in item.findall("wp:comment", NS):
        if text(c, "wp:comment_approved") != "1":
            continue
        parent = text(c, "wp:comment_parent")
        rows.append(
            {
                "id": text(c, "wp:comment_id"),
                "parent": parent if parent not in ("", "0") else None,
                "slug": slug,
                "name": text(c, "wp:comment_author") or "Anonymous",
                "email": text(c, "wp:comment_author_email"),
                "body": plain(text(c, "wp:comment_content")),
                "date": iso(text(c, "wp:comment_date_gmt")),
            }
        )

# Parents before replies, so the foreign key is satisfied.
rows.sort(key=lambda r: (r["parent"] is not None, r["date"]))

print(f"-- {len(rows)} approved comments from {sys.argv[1].rsplit('/', 1)[-1]}")
for r in rows:
    print(
        "INSERT OR IGNORE INTO _emdash_comments "
        "(id, collection, content_id, parent_id, author_name, author_email, body, status, created_at, updated_at) "
        f"SELECT {sql(r['id'])}, 'posts', p.id, {sql(r['parent'])}, {sql(r['name'])}, {sql(r['email'])}, "
        f"{sql(r['body'])}, 'approved', {sql(r['date'])}, {sql(r['date'])} "
        f"FROM ec_posts p WHERE p.slug = {sql(r['slug'])} AND p.deleted_at IS NULL LIMIT 1;"
    )
