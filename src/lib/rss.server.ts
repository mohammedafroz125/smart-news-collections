export interface FeedItem {
  title: string;
  link: string;
  excerpt: string;
  imageUrl?: string;
  publishedAt?: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "\u2019",
  lsquo: "\u2018",
  ldquo: "\u201C",
  rdquo: "\u201D",
  times: "×",
  rupee: "₹",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function stripCdata(input: string): string {
  return input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function tagContent(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : undefined;
}

function stripHtml(html: string): string {
  return decodeEntities(
    stripCdata(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const parsed = new Date(decodeEntities(stripCdata(raw)).trim());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function findImage(entry: string, rawExcerpt: string): string | undefined {
  const media = entry.match(/<media:content[^>]*url="([^"]+)"/i);
  if (media) return decodeEntities(media[1]);
  const mediaThumb = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (mediaThumb) return decodeEntities(mediaThumb[1]);
  const enclosure = entry.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i);
  if (enclosure) return decodeEntities(enclosure[1]);
  const itunes = entry.match(/<itunes:image[^>]*href="([^"]+)"/i);
  if (itunes) return decodeEntities(itunes[1]);
  const inline = rawExcerpt.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (inline) return decodeEntities(inline[1]);
  return undefined;
}

function findLink(entry: string): string | undefined {
  const atomHref = entry.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']alternate/i);
  if (atomHref) return decodeEntities(atomHref[1]);
  const plainLink = tagContent(entry, "link");
  if (plainLink) {
    const url = stripCdata(plainLink).trim();
    if (url.startsWith("http")) return url;
  }
  const guid = tagContent(entry, "guid");
  if (guid) {
    const url = decodeEntities(stripCdata(guid)).trim();
    if (url.startsWith("http")) return url;
  }
  return undefined;
}

export function parseFeed(xml: string): FeedItem[] {
  const entries = xml.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const items: FeedItem[] = [];

  for (const entry of entries) {
    const rawTitle = tagContent(entry, "title");
    const title = rawTitle ? decodeEntities(stripCdata(rawTitle)).replace(/\s+/g, " ").trim() : "";
    const link = findLink(entry);
    if (!title || !link) continue;

    const rawExcerpt =
      tagContent(entry, "content:encoded") ??
      tagContent(entry, "description") ??
      tagContent(entry, "summary") ??
      tagContent(entry, "content") ??
      "";
    const excerpt = stripHtml(rawExcerpt).slice(0, 800);

    items.push({
      title,
      link,
      excerpt,
      imageUrl: findImage(entry, rawExcerpt),
      publishedAt: parseDate(tagContent(entry, "pubDate") ?? tagContent(entry, "published") ?? tagContent(entry, "updated")),
    });
  }

  return items;
}

export async function fetchFeed(feedUrl: string, maxItems = 20): Promise<FeedItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DomesticNewsCollector/1.0; MCA project)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`Feed returned HTTP ${response.status}`);
  }
  const xml = await response.text();
  return parseFeed(xml).slice(0, maxItems);
}
