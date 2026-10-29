import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const CANONICAL_HOST = "www.treehater.com";

export default {
	...handler,
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		// WordPress served the site on www and 301'd the apex there; keep that.
		if (url.hostname === "treehater.com") {
			url.hostname = CANONICAL_HOST;
			return Response.redirect(url.toString(), 301);
		}
		return handler.fetch!(request, env, ctx);
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler<Env>;
