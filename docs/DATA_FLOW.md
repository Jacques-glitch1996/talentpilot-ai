# TalentPilot AI — Data Flow

## Main flows

### 1) Authentication
- User signs in via Supabase Auth (email/password)
- Supabase returns a session (access_token)
- Client stores session (Supabase client default behavior)

### 2) Candidates CRUD
- Client calls Supabase PostgREST
- RLS enforces tenant isolation using `organization_id = current_org_id()`
- Validation:
  - DB constraint: email OR phone required
  - Email/phone format constraints

### 3) AI generation
- Client calls POST /api/ai/generate with Authorization Bearer token
- API route:
  1) validates token via supabase.auth.getUser()
  2) checks rate limit (ai_logs in last hour)
  3) calls Anthropic API
  4) logs into `ai_logs` (RLS enforced)

### 4) Documents
- Upload to Supabase Storage (private bucket)
- File metadata stored in `documents` table
- Access restricted by RLS + bucket policies

## Where data lives
- Database: Supabase Postgres (tables)
- Files: Supabase Storage (documents, CV, generated files if stored)
- AI processing: Anthropic API receives prompt content (minimize PII where possible)

## Data minimization guidance
- Avoid including unnecessary personal identifiers in AI prompts
- Prefer: job requirements, anonymized candidate summaries
- When needed: explicit user consent + retention policy