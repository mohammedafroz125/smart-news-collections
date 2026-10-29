# Roadmap — Domestic News Collections using ML

MCA major project for Mohammed Afroz (Hall Ticket 1314-24-862-003), guided by
Ms. Rana Tilath, MESCO Institute of Management and Computer Sciences, Hyderabad.

## Done
- [x] Enable Lovable Cloud (database + auth) and design the schema
      (news_sources, articles, collection_runs, admin roles, first-user-admin trigger)
- [x] Seed 11 national Indian news RSS sources
- [x] Server-side collection pipeline: RSS fetch + parse + dedupe + store
- [x] ML pipeline on Lovable AI: topic classification, sentiment score,
      abstractive summary, keyword extraction (batched)
- [x] Public dashboard (/, /article/$id, /about) with filters, search, ticker
- [x] Admin console (/admin): run collection, run ML on pending, source CRUD,
      run history, topic/sentiment charts
- [x] Auth: email/password + Google + Sign in with Lovable; first signup becomes admin
- [x] Scheduled jobs: /api/public/jobs/collect-news (3x daily) and
      /api/public/jobs/process-news (ML batch, every 5 min)
- [x] RSS parser unit tests

## Open
- [ ] Publish the app (needed for the scheduled jobs to hit a stable URL end to
      end) — blocked until the user clicks Publish
- [ ] First real login by the student to become the admin account
