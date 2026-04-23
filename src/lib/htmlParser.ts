import { sanitizeHtml, textFromHtml } from "./contentCleaner";
import { slugFromTitle } from "./slugFormatter";

export interface ParsedHtmlContent {
  title: string;
  meta_description: string;
  content: string;
  slug: string;
}

export function parseHtmlContent(html: string): ParsedHtmlContent {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("title")?.textContent?.trim() || doc.querySelector("h1")?.textContent?.trim() || "Untitled";
  const meta = doc.querySelector('meta[name="description"]')?.getAttribute("content") || textFromHtml(doc.body.innerHTML).slice(0, 155);
  return {
    title,
    meta_description: meta,
    content: sanitizeHtml(doc.body.innerHTML),
    slug: slugFromTitle(title),
  };
}
