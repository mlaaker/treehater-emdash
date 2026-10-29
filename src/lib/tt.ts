/**
 * Helpers for rendering EmDash content in Twenty Twenty's markup, so the
 * site keeps the URLs and look it had on WordPress.
 */
import {
	getCommentCount,
	getEmDashCollection,
	getTaxonomyTermsWithCacheHint,
	getTermsForEntries,
} from "emdash";

/** WordPress showed 10 posts per page on the home page and every archive. */
export const POSTS_PER_PAGE = 10;

/** WordPress permalinks were /%postname%/, for posts and pages alike. */
export function permalink(slug: string): string {
	return `/${slug}/`;
}

/** "April 4, 2020", as Twenty Twenty printed post dates. */
export function wpDate(date: Date | null | undefined): string {
	if (!date) return "";
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "America/Los_Angeles",
	});
}

/** "No Comments" / "1 Comment" / "3 Comments", Twenty Twenty's archive label. */
export function commentLabel(count: number): string {
	if (count === 0) return "No Comments";
	return count === 1 ? "1 Comment" : `${count} Comments`;
}

/** "One reply on" / "3 replies on", Twenty Twenty's comment section heading. */
export function repliesHeading(count: number, title: string): string {
	const lead = count === 1 ? "One reply" : `${count} replies`;
	return `${lead} on “${title}”`;
}

/** Page number from a rest param like "page/2"; null when it isn't one. */
export function parsePageParam(rest: string | undefined): number | null {
	if (!rest) return 1;
	const match = /^page\/(\d+)\/?$/.exec(rest);
	if (!match) return null;
	const n = Number(match[1]);
	return n >= 1 ? n : null;
}

type PostsQuery = Parameters<typeof getEmDashCollection<"posts">>[1];

/**
 * The site has a few dozen posts, so load the matching set once and slice
 * it into WordPress-style numbered pages (/page/2/) rather than cursors.
 */
export async function loadPostPage(page: number, query: PostsQuery = {}) {
	const { entries, cacheHint } = await getEmDashCollection("posts", {
		orderBy: { published_at: "desc" },
		limit: 1000,
		...query,
	});
	const totalPages = Math.max(1, Math.ceil(entries.length / POSTS_PER_PAGE));
	const posts = entries.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
	return { posts, cacheHint, totalPages, total: entries.length };
}

export type PostEntry = Awaited<ReturnType<typeof loadPostPage>>["posts"][number];

/** Categories, tags and comment counts for a list of posts, in two queries plus counts. */
export async function loadPostExtras(posts: PostEntry[]) {
	const ids = posts.map((p) => p.data.id);
	const [categories, tags, counts] = await Promise.all([
		getTermsForEntries("posts", ids, "category"),
		getTermsForEntries("posts", ids, "tag"),
		Promise.all(ids.map((id) => getCommentCount("posts", id))),
	]);
	return new Map(
		posts.map((p, i) => [
			p.data.id,
			{
				categories: categories.get(p.data.id) ?? [],
				tags: tags.get(p.data.id) ?? [],
				commentCount: counts[i] ?? 0,
			},
		]),
	);
}

export type PostExtras = NonNullable<
	ReturnType<Awaited<ReturnType<typeof loadPostExtras>>["get"]>
>;

/** Loads a category or tag archive page; null when the term or page doesn't exist. */
export async function loadTermArchive(
	taxonomy: "category" | "tag",
	slug: string | null | undefined,
	rest: string | undefined,
) {
	const page = parsePageParam(rest);
	if (!slug || !page) return null;
	const terms = await getTaxonomyTermsWithCacheHint(taxonomy, { includeCounts: false });
	const term = terms.data.find((t) => t.slug === slug);
	if (!term) return null;
	const result = await loadPostPage(page, { where: { [taxonomy]: term.slug } });
	if (page > result.totalPages) return null;
	return { term, page, ...result, cacheHints: [terms.cacheHint, result.cacheHint] };
}

export function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}
