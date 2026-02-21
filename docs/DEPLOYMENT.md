# TalentPilot AI — Deployment (Vercel)

## Deploy source
- GitHub repository connected to Vercel
- Auto-deploy on push to main

## Required environment variables (Vercel)
Frontend (public):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Server (secret):
- ANTHROPIC_API_KEY

## Supabase Auth URL settings
- Add Vercel domain to:
  - Site URL
  - Redirect URLs
- Example:
  - https://talentpilot-ai.vercel.app
  - https://<your-domain>

## Build
- npm install
- npm run build

## Rollback
- Vercel → Deployments → select previous deployment → Promote to Production