import type { APIRoute } from "astro";

// On WordPress, /about/ (the page titled "Home") was only a JavaScript redirect to the home page.
export const GET: APIRoute = ({ redirect }) => redirect("/", 301);
