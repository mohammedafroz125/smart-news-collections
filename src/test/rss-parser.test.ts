import { describe, expect, it } from "vitest";
import { parseFeed, decodeEntities } from "@/lib/rss.server";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed</title>
    <item>
      <title><![CDATA[Monsoon rains batter Hyderabad,  more showers &#39;likely&#39;]]></title>
      <link>https://example.com/monsoon-hyderabad</link>
      <description><![CDATA[<p>Heavy <b>rainfall</b> disrupted traffic in the old city on Tuesday. Officials &amp; volunteers responded.</p>]]></description>
      <pubDate>Tue, 27 Oct 2026 08:30:00 +0530</pubDate>
      <media:content url="https://images.example.com/monsoon.jpg" medium="image" />
    </item>
    <item>
      <title>India clinch T20 series with super-over win</title>
      <link>https://example.com/t20-series-win</link>
      <description>India sealed the series in a dramatic super over in Ranchi. &lt;b&gt;Full report&lt;/b&gt; inside.</description>
      <pubDate>Tue, 27 Oct 2026 06:15:00 GMT</pubDate>
      <enclosure url="https://images.example.com/cricket.jpg" type="image/jpeg" length="1024" />
    </item>
  </channel>
</rss>`;

describe("parseFeed (RSS collection stage)", () => {
  it("parses items with CDATA titles and decodes entities", () => {
    const items = parseFeed(SAMPLE_XML);
    expect(items).toHaveLength(2);
    const first = items[0]!;
    expect(first.title).toBe("Monsoon rains batter Hyderabad, more showers 'likely'");
    expect(first.link).toBe("https://example.com/monsoon-hyderabad");
  });

  it("strips HTML tags and decodes entities in excerpts", () => {
    const [first, second] = parseFeed(SAMPLE_XML);
    expect(first!.excerpt).toBe(
      "Heavy rainfall disrupted traffic in the old city on Tuesday. Officials & volunteers responded.",
    );
    expect(second!.excerpt).toBe(
      "India sealed the series in a dramatic super over in Ranchi. Full report inside.",
    );
  });

  it("extracts images from media:content and enclosure tags", () => {
    const [first, second] = parseFeed(SAMPLE_XML);
    expect(first!.imageUrl).toBe("https://images.example.com/monsoon.jpg");
    expect(second!.imageUrl).toBe("https://images.example.com/cricket.jpg");
  });

  it("normalises publication dates to ISO timestamps", () => {
    const [first, second] = parseFeed(SAMPLE_XML);
    expect(first!.publishedAt).toBe(new Date("Tue, 27 Oct 2026 08:30:00 +0530").toISOString());
    expect(second!.publishedAt).toBe(new Date("Tue, 27 Oct 2026 06:15:00 GMT").toISOString());
  });

  it("decodes standalone entity strings", () => {
    expect(decodeEntities("Telangana &amp; AP &#8212; a &#x20B9;500 plan")).toBe("Telangana & AP — a ₹500 plan");
  });
});
