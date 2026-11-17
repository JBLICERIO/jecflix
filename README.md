# Jecflix v1.0

A Netflix-inspired, family-only streaming catalog. The frontend is hosted on GitHub Pages; Supabase handles authentication and the catalog database. Video is played from external providers and authorized video URLs.

## What's included

- Responsive dark Netflix-inspired catalog UI
- Home featured title, Movies, Series, My List, and search
- Title details and player overlays
- YouTube embed playback
- Direct MP4/WebM playback
- HLS playback through HLS.js (or native browser support)
- External embed URL option
- Magnet-link handoff to a compatible torrent client
- Supabase email/password authentication
- Admin-only add/edit/delete enforced by database Row Level Security
- GitHub Pages deployment workflow

## Important v1 limitations

- The included sample titles are visual demo data. They are not a real catalog.
- Family sign-in and secure catalog management are enabled only after Supabase is configured.
- Watchlist is stored locally in the browser in v1. It is not synced across family devices yet.
- Magnet links open through the device's registered torrent handler. This version does not stream torrents inside the browser.
- Some providers block embedding, require their own login, or prohibit third-party playback. The app cannot bypass those restrictions.
- Only add videos you own, are licensed to use, or are authorized to access and share.

## Supabase connection already configured

This package includes a local `.env.local` file for the Supabase project configured during setup. Keep `.env.local` private and do not commit it to GitHub. For GitHub Actions deployment, add the same two values as repository Actions secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The publishable key is intended for browser use with correctly configured Row Level Security. Never use a Supabase secret or service-role key in the frontend.

## 1. Create the Supabase project

1. Create a project at https://supabase.com/.
2. Open the SQL Editor and run `supabase-schema.sql`.
3. In Authentication > Providers, enable Email.
4. For a private family service, disable public sign-ups after you have created the accounts you need, or keep sign-ups enabled only during setup and invite family members deliberately.
5. Create your own account using the app once it is configured.
6. In Authentication > Users, copy your account UUID.
7. Run this in the SQL Editor, replacing the UUID:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'YOUR_AUTH_USER_UUID';
   ```

8. Create family accounts through Supabase Auth. New accounts receive the `family` role automatically.

## 2. Configure local development

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the Supabase project URL and publishable/anon key.
4. Install dependencies and run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite.

The Supabase publishable/anon key is intended for client use when Row Level Security is correctly configured. Never put a Supabase service-role key in this project.

## 3. Deploy to GitHub Pages

1. Create a GitHub repository named `jecflix`.
2. Upload all project files to the repository root and push to the `main` branch.
3. In GitHub repository Settings > Secrets and variables > Actions, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Settings > Pages, set the build/deployment source to **GitHub Actions**.
5. Push to `main` or run the workflow manually.
6. Your site will be published at `https://YOUR-GITHUB-USERNAME.github.io/jecflix/`.

## 4. Video source notes

- YouTube: paste a normal watch URL. Playback uses YouTube's privacy-enhanced embed host.
- MP4/WebM: paste a direct media URL. The host must allow cross-origin playback where required.
- HLS: paste an authorized `.m3u8` URL. HLS.js needs the source host to allow CORS; Safari may use native HLS.
- External embed: paste the provider's official embed URL, not necessarily the public watch page. Some sites refuse framing.
- Magnet: paste a magnet URI. The device must have a compatible torrent client/handler installed.

## 5. Security checklist before inviting family

- Confirm your profile role is `admin` and family profiles are `family`.
- Keep Row Level Security enabled.
- Never expose service-role keys.
- Use strong unique passwords and enable email confirmation or other appropriate account protections.
- Do not publish the repository with secrets committed in `.env`.
- Do not assume an obscure URL is private. Authentication and database policies provide access control.
