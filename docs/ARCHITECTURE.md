# TalentPilot AI — Architecture

## Stack
- Frontend: Next.js (App Router)
- Auth + DB + RLS + Storage: Supabase
- Hosting: Vercel
- AI Provider: Anthropic (Claude)
- Logs IA: table `ai_logs` (multi-org + user_id)

## High-level components
1. Web App (Next.js)
   - Pages: /login, /dashboard, /candidates, /job-posts, /messages, /interviews, /documents, /ai, /performance, /history
   - Auth: Supabase session (access_token)
2. API Routes (Next.js)
   - POST /api/ai/generate
   - Auth via Authorization: Bearer <token>
   - Inserts AI logs in `ai_logs` (RLS enforced)
3. Database (Supabase Postgres)
   - Multi-organization design via `organization_id`
   - RLS enabled on core tables
   - Function: `public.current_org_id()` derives org_id from `public.users` using auth.uid()
4. Storage (Supabase)
   - Buckets for documents (private)
   - Access controlled via policies

## Security model
- Tenant isolation: `organization_id = current_org_id()`
- User attribution: `user_id = auth.uid()`
- No service role key in frontend
- AI requests are authenticated and rate-limited

## Data classification (typical)
- Candidates: PII (name, email, phone, CV)
- Messages/notes: PII + HR sensitive
- AI logs: may contain PII (input/output), must be protected

## Environments
- Local dev: .env.local
- Production: Vercel Environment Variables