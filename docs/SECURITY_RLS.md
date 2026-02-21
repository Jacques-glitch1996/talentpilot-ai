# TalentPilot AI — Security & RLS

## Tenant isolation principle
All tenant-scoped tables include `organization_id`.
RLS policies must ensure:
- SELECT: organization_id = current_org_id()
- INSERT: organization_id = current_org_id() AND user_id = auth.uid() (when applicable)

## current_org_id()
- Function: public.current_org_id()
- Looks up organization_id from public.users where id = auth.uid()
- SECURITY DEFINER + explicit search_path to prevent mutable search_path risks

## Tables expected to have RLS enabled
- organizations
- users
- candidates
- job_posts
- messages
- interviews
- documents
- ai_logs

## AI logs
- user_id default = auth.uid()
- organization_id default = current_org_id()
- Policies:
  - SELECT: organization_id = current_org_id()
  - INSERT: organization_id = current_org_id() AND user_id = auth.uid()
  - UPDATE/DELETE: same + user_id = auth.uid()

## Notes
- Never expose service_role key to client
- Keep buckets private; enforce access via policies