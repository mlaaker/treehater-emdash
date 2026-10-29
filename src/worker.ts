import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const CANONICAL_HOST = "www.treehater.com";
const STAGING_HOST = "staging.treehater.com";

export default {
	...handler,
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		// WordPress served the site on www and 301'd the apex there; keep that.
		if (url.hostname === "treehater.com") {
			url.hostname = CANONICAL_HOST;
			return Response.redirect(url.toString(), 301);
		}
		const response = await handler.fetch!(request, env, ctx);
		// The staging host exists for the admin and import before cutover; keep it out of search.
		if (url.hostname === STAGING_HOST) {
			const headers = new Headers(response.headers);
			headers.set("X-Robots-Tag", "noindex, nofollow");
			return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
		}
		return response;
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler<Env>;
