import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { processPendingArticles } from "@/lib/collect.server";

/**
 * Scheduled ML job. Runs the classification / sentiment / summarization /
 * keyword pipeline over a small batch of pending articles so each run stays
 * fast enough for the scheduler.
 */
export const Route = createFileRoute("/api/public/jobs/process-news")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        try {
          const result = await processPendingArticles(3);
          return Response.json({ success: true, processed: result.processed, failed: result.failed });
        } catch (error) {
          console.error("Scheduled ML processing failed:", error);
          return Response.json(
            { success: false, error: error instanceof Error ? error.message : "processing failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
