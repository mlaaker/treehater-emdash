import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
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
			// Sandbox runner (Workers Paid) for plugins installed from the registry,
			// which is the default discovery source when sandboxing is on.
			sandboxRunner: sandbox(),
			// Passkeys are bound to the rpId, and login redirects and CSRF checks use
			// the same origin, all from siteUrl. The admin is claimed on www after
			// cutover (never on workers.dev), so www is the one origin.
			siteUrl: "https://www.treehater.com",
		}),
	],
	// Fonts are Twenty Twenty's own self-hosted Inter, in public/twentytwenty/.
	devToolbar: { enabled: false },
});
