# CASEGUESS
1. `npm install`, copy `.env.example` to `.env`, fill in Supabase URL and anon key (never the service-role key).
2. Supabase SQL editor, in order: `supabase/schema.sql`, `supabase/seed.sql`, `supabase/migrations/002_board_findings.sql`, `supabase/migrations/003_cases_2_5.sql`. Existing databases only need the two migrations.
3. Auth > Providers: enable Google and Apple. Callback URL for both: `https://<project>.supabase.co/auth/v1/callback`.
   Google: create an OAuth Web client in Google Cloud Console, add that callback as an authorized redirect URI.
   Apple: create a Services ID and a Sign in with Apple key in Apple Developer, add the callback as a return URL, paste the Services ID and generated secret into Supabase.
4. Auth > URL Configuration: add `http://localhost:5173` and your Vercel URL to Site URL / redirect list.
5. `npm run dev`. Deploy: push to GitHub, import in Vercel, set the two env vars.
Security: `case_solutions` has RLS with no policy, so only `submit_accusation` (security definer) can read it. XP/score change only through that function.
Findings (statement vs evidence) are readable only after the player collects the related evidence (RLS on `contradictions`). Board and journal persist in `board_state`.
Not yet built: daily mystery, training mode, achievements logic, audio, PWA, full landing page, hints.
