import type { APIRoute } from "astro";

// Search lives at WordPress's /?s=term; keep EmDash's /search?q= working too.
export const GET: APIRoute = ({ url, redirect }) => {
	const q = url.searchParams.get("q") ?? url.searchParams.get("s") ?? "";
	return redirect(q ? `/?s=${encodeURIComponent(q)}` : "/", 301);
};
