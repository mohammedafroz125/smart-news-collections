# Roadmap — Domestic News Collections using ML

MCA major project for Mohammed Afroz (Hall Ticket 1314-24-862-003), guided by
Ms. Rana Tilath, MESCO Institute of Management and Computer Sciences, Hyderabad.

## Done
- [x] Enable Lovable Cloud (database + auth) and design the schema
      (news_sources, articles, collection_runs, admin roles, first-user-admin trigger)
- [x] Seed 12 national Indian news RSS sources (2 unreachable feeds replaced with
      Mint, New Indian Express; Business Standard added)
- [x] Server-side collection pipeline: RSS fetch + parse + dedupe + store
      (verified live: 135 fetched / 124 new stored from 10 sources)
- [x] ML pipeline on Lovable AI (gemini flash-lite): topic classification,
      sentiment score, abstractive summary, keyword extraction (batched)
- [x] Public dashboard (/, /article/$id, /about) with filters, search, ticker —
      verified in browser with 60 real story cards, no console errors
- [x] Admin console (/admin): run collection, run ML on pending, source CRUD,
      run history, topic/sentiment charts
- [x] Auth: email/password + Google + Sign in with Lovable; first signup becomes admin
- [x] Managed HTTP schedules: collect-news 3x daily (04:00/10:00/17:30 IST),
      process-news ML batch every 15 min
- [x] RSS parser unit tests (6/6 passing); typecheck and build clean

## Open
- [ ] Publish the app — scheduled jobs can only reach the stable published URL
      (preview is behind the sign-in gate). After publish, verify the first
      scheduled collection + ML pass fills category/sentiment/summary fields.
- [ ] Student signs up the first account (becomes admin) and confirms via email.
- [ ] ML output on real articles not yet observed (blocked on publish + schedule,
      or the admin "Run ML on pending" button once signed in).
