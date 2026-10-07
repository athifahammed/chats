# CHATS Simple

Mobile-first private chat app using GitHub Pages + Supabase.

1. Put your Supabase URL and anon/public key in `js/config.js`.
2. In Supabase Authentication > Providers, enable **Anonymous** sign-ins.
3. Run `supabase-schema.sql` once.
4. Upload the files to GitHub Pages.

There is no login page. The browser automatically gets/restores an anonymous Supabase session.
