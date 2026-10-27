import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { collectAllSources } from "@/lib/collect.server";

/**
 * Scheduled collection job. Fetches every active RSS feed, deduplicates and
 * stores new articles. Called by the managed HTTP schedule; also usable
 * manually.
 */
export const Route = createFileRoute("/api/public/jobs/collect-news")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        try {
          const result = await collectAllSources("scheduled");
          return Response.json({
            success: true,
            fetched: result.fetched,
            inserted: result.inserted,
            failedSources: result.failed,
          });
        } catch (error) {
          console.error("Scheduled collection failed:", error);
          return Response.json(
            { success: false, error: error instanceof Error ? error.message : "collection failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
