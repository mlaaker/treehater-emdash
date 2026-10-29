/**
 * Products for /store/. On WordPress this page was a single
 * [amazon_link asins='...' template='ProductGrid' tag='treehater-20'] shortcode
 * from the Amazon Associates plugin, which no longer renders. The ASINs and
 * tag below come from that shortcode; names were looked up on Amazon
 * 2026-10-29.
 *
 * No product images: Associates rules only allow Amazon images served
 * through their API or SiteStripe, so the grid is text links.
 */
export const ASSOCIATES_TAG = "treehater-20";

export interface Product {
	asin: string;
	name: string;
}

export const products: Product[] = [
	{ asin: "B073FTGBZY", name: "DEWALT 20V Max Compact Cordless Chainsaw" },
	// TODO(MICAH): product name not retrievable on 2026-10-29 (may be discontinued)
	{ asin: "B01M1ICKM3", name: "View on Amazon" },
	{ asin: "B01M1CCIWH", name: "Root Slayer Garden Shovel, Serrated Blade" },
	{ asin: "B004GVYXKC", name: "Spectracide Stump Remover" },
	// TODO(MICAH): product name not retrievable on 2026-10-29 (may be discontinued)
	{ asin: "B000LNWHBQ", name: "View on Amazon" },
	// TODO(MICAH): product name not retrievable on 2026-10-29 (may be discontinued)
	{ asin: "B017I071JM", name: "View on Amazon" },
	{ asin: "B07BGD5952", name: "4 Inch Solid Copper Nail Spikes, Pack of 10" },
	{ asin: "B01E5NQ2U4", name: "TABOR TOOLS 30 Inch Anvil Lopper" },
	{ asin: "B071DSST7M", name: "Antique Silver Hand Saw Charms" },
];

export function productUrl(asin: string): string {
	return `https://www.amazon.com/dp/${asin}?tag=${ASSOCIATES_TAG}`;
}
