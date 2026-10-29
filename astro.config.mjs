import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import webhookNotifier from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	site: "https://www.treehater.com",
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [formsPlugin()],
			sandboxed: [webhookNotifier],
			sandboxRunner: sandbox(),
			marketplace: "https://marketplace.emdashcms.com",
			// Passkeys are bound to the rpId, and login redirects and CSRF checks use
			// the same origin, all from siteUrl. The admin lives on the apex (which
			// otherwise only 301s to www, as on WordPress), so it works before
			// cutover and its rpId "treehater.com" is also accepted on www after.
			// Public URLs stay on www (the site setting "url" and `site` above).
			siteUrl: "https://treehater.com",
			allowedOrigins: ["https://www.treehater.com"],
		}),
	],
	// Fonts are Twenty Twenty's own self-hosted Inter, in public/twentytwenty/.
	devToolbar: { enabled: false },
});
