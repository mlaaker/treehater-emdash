import type { APIRoute } from "astro";

// WordPress's post-format archive (/type/image/) held one post; EmDash has no post formats.
export const GET: APIRoute = ({ params, redirect }) =>
	params.format === "image" ? redirect("/off-with-their-heads/", 301) : redirect("/", 301);
