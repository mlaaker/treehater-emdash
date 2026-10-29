import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const APEX = "treehater.com";
const CANONICAL_HOST = "www.treehater.com";
/** The admin, its API and its bundled assets are served on the apex (siteUrl). */
const ADMIN_PATHS = /^\/(_emdash|_astro)(\/|$)/;

export default {
	...handler,
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		// WordPress served the site on www and 301'd the apex there; keep that for
		// everything except the admin.
		if (url.hostname === APEX && !ADMIN_PATHS.test(url.pathname)) {
			url.hostname = CANONICAL_HOST;
			return Response.redirect(url.toString(), 301);
		}
		return handler.fetch!(request, env, ctx);
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler<Env>;
