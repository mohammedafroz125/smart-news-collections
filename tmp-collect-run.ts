import { collectAllSources } from "@/lib/collect.server";

const result = await collectAllSources("manual");
console.log(
  JSON.stringify({ fetched: result.fetched, inserted: result.inserted, failed: result.failed }, null, 2),
);
for (const s of result.sources) {
  console.log(`${s.name}: fetched=${s.fetched} inserted=${s.inserted}${s.error ? " ERROR=" + s.error : ""}`);
}
process.exit(0);
