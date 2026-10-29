/**
 * RSS 2.0 feed of the latest posts. Served at /feed/ (WordPress's feed URL,
 * which existing subscribers use) and /rss.xml.
 */
import type { APIRoute } from "astro";
import { extractPlainText, getEmDashCollection, getSiteSettings } from "emdash";

import { permalink } from "./tt";
import { getSiteLocale } from "../utils/locale";
import { resolveBlogSiteIdentity } from "../utils/site-identity";

export const feed: APIRoute = async ({ site, url }) => {
	const siteUrl = site ?? new URL(url.origin);
	const { siteTitle, siteTagline } = resolveBlogSiteIdentity(await getSiteSettings());

	const { entries: posts } = await getEmDashCollection("posts", {
		orderBy: { published_at: "desc" },
		limit: 20,
	});

	const items = posts
		.map((post) => {
			if (!post.data.publishedAt) return null;
			const pubDate = post.data.publishedAt.toUTCString();

			const postUrl = new URL(permalink(post.id), siteUrl).href;
			const title = escapeXml(post.data.title || "Untitled");
			// Imported WordPress posts have no excerpts; fall back to the opening text.
			const summary = post.data.excerpt || extractPlainText(post.data.content ?? []).slice(0, 300);
			const description = escapeXml(summary);

			return `    <item>
      <title>${title}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
		})
		.filter(Boolean)
		.join("\n");

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <description>${escapeXml(siteTagline)}</description>
	<link>${siteUrl.href}</link>
	<atom:link href="${new URL("/feed/", siteUrl).href}" rel="self" type="application/rss+xml"/>
    <language>${getSiteLocale() ?? "en-us"}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};

const XML_ESCAPE_PATTERNS = [
	[/&/g, "&amp;"],
	[/</g, "&lt;"],
	[/>/g, "&gt;"],
	[/"/g, "&quot;"],
	[/'/g, "&apos;"],
] as const;

function escapeXml(str: string): string {
	let result = str;
	for (const [pattern, replacement] of XML_ESCAPE_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}
