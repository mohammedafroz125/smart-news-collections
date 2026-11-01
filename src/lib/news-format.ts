export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "just now";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "just now";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  return formatDistance(date, new Date(), { addSuffix: true });
}

function formatDistance(date: Date, base: Date, options: { addSuffix: boolean }): string {
  const seconds = Math.floor((base.getTime() - date.getTime()) / 1000);
  const suffix = options.addSuffix ? " ago" : "";
  if (seconds < 3600) {
    const minutes = Math.max(1, Math.floor(seconds / 60));
    return `${minutes} minute${minutes === 1 ? "" : "s"}${suffix}`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"}${suffix}`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? "" : "s"}${suffix}`;
}

const SENTIMENT_STYLES = {
  positive: {
    label: "Positive",
    dot: "bg-sentiment-positive",
    text: "text-sentiment-positive",
    bg: "bg-sentiment-positive/10",
  },
  negative: {
    label: "Negative",
    dot: "bg-sentiment-negative",
    text: "text-sentiment-negative",
    bg: "bg-sentiment-negative/10",
  },
  neutral: {
    label: "Neutral",
    dot: "bg-sentiment-neutral",
    text: "text-sentiment-neutral",
    bg: "bg-sentiment-neutral/10",
  },
} as const;

export function sentimentStyle(sentiment: string) {
  const key: keyof typeof SENTIMENT_STYLES =
    sentiment === "positive" || sentiment === "negative" ? sentiment : "neutral";
  return SENTIMENT_STYLES[key];
}

export function formatSentimentScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  const value = score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
  return value;
}
