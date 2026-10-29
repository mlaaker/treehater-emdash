import type { APIRoute } from "astro";

// The blog template's /posts/:slug URLs, in case anything links to them.
export const GET: APIRoute = ({ params, redirect }) => redirect(`/${params.slug}/`, 301);
