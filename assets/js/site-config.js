/**
 * Lokenath Restaurant & Hotel — site-config.js
 * Business details used by scripts. The HTML pages contain the same details
 * as plain text, so change them in both places if they ever change.
 */

import { formatCurrency } from "./utils.js";

export const RESTAURANT_NAME = "Lokenath Restaurant & Hotel";
export const WHATSAPP_NUMBER = "919387078054"; // country code + number, digits only
export const DELIVERY_AREA = "Kadamtala to Block Road (Ramkrishna Nagar)";

// WhatsApp links get unreliable when extremely long, so long orders are trimmed.
const MAX_URL_LENGTH = 1900;

/**
 * Build a wa.me link that opens WhatsApp with the order typed out.
 * Nothing is sent until the customer presses send in WhatsApp.
 * @param {Array<{name:string,qty:number,priceCents:number}>} items
 * @param {{count:number,totalCents:number}} totals
 */
export function buildOrderUrl(items, totals) {
  const lines = items.map(
    (item) => `- ${item.qty} x ${item.name} = ${formatCurrency(item.priceCents * item.qty)}`
  );
  const header = `Hello ${RESTAURANT_NAME}, I would like to order:`;
  const footer = [
    `Total: ${formatCurrency(totals.totalCents)}`,
    "",
    "Name:",
    `Address (${DELIVERY_AREA}):`,
    "Phone:",
    "",
    "Sent from the website cart.",
  ].join("\n");

  const make = (itemLines) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      [header, ...itemLines, footer].join("\n")
    )}`;

  let shown = lines.length;
  let url = make(lines);
  while (url.length > MAX_URL_LENGTH && shown > 1) {
    shown -= 1;
    url = make([
      ...lines.slice(0, shown),
      `...and ${lines.length - shown} more items (please confirm with me)`,
    ]);
  }
  return url;
}
