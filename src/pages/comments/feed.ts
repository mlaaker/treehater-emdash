import type { APIRoute } from "astro";

// WordPress's comments feed has no EmDash equivalent; send readers to the posts feed.
export const GET: APIRoute = ({ redirect }) => redirect("/feed/", 301);
