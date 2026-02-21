# TalentPilot AI — Incident Response (Quick Runbook)

## Typical incidents
1) Login failures (auth outage, redirect misconfig)
2) Data access issues (RLS misconfig)
3) AI API failures (provider outage, quota, invalid key)
4) Storage upload failures
5) Unexpected errors in production

## Response steps
1) Confirm impact
- Is it all users or single tenant?
- Is it only one feature?

2) Identify source
- Vercel logs (Functions)
- Browser console
- Supabase logs (auth/db)
- AI provider dashboard

3) Mitigate fast
- Disable feature flag (if implemented)
- Temporarily reduce AI traffic
- Roll back deployment on Vercel

4) Fix root cause
- Patch + test in staging
- Deploy to production

5) Post-incident
- Document timeline
- Add monitoring / test to prevent recurrence