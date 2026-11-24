# Movies Authentication Setup

The browser frontend connects to the Supabase project `movies-cinema` using the public publishable key in `assets/js/supabase-config.js`. A publishable key is intended for browser use; never put a Supabase service-role key in this repository.

## Supabase URL configuration

In the Supabase dashboard for `movies-cinema`:

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to the exact origin where the Movies website is hosted (for example, your deployed GitHub Pages or other static-hosting origin).
3. Add these redirect URLs, using that same origin:
   - `https://YOUR-SITE-ORIGIN/auth.html`
   - `https://YOUR-SITE-ORIGIN/auth.html?reset=1`
4. If developing locally, add the local origin and its auth paths too (for example, `http://localhost:3000/auth.html` and `http://localhost:3000/auth.html?reset=1`).

Replace the example origin with the real deployed origin. Do not use a broad wildcard unless it is genuinely needed.

## Email confirmation

If email confirmation is enabled, a new user must open the confirmation link sent by Supabase before signing in. The link returns to `auth.html`. Email delivery and provider limits depend on the project's Auth email configuration.

## Administrator access

New registrations are ordinary viewer accounts. Users cannot grant themselves administrator access through the website.

After the intended owner has registered and confirmed their email, grant admin access from the Supabase SQL Editor using the account email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('REPLACE_WITH_OWNER_EMAIL')
on conflict (user_id) do update set role = excluded.role;
```

Replace the placeholder with the intended account email before running the query. Only trusted project owners should run this statement. Never expose the service-role key.

## Current scope

- Registration, sign-in, sign-out, and password-reset request/update are implemented in the frontend.
- A profile row is created automatically by the database trigger when an Auth user is created.
- Room membership, chat, playback, and film permissions are enforced by database Row Level Security.
- The Studio page is still a preview and must not be treated as a secured admin dashboard until its UI is connected to authenticated role checks and real server-backed film workflows.
- Authentication must be tested on the actual deployed website before inviting other viewers.
