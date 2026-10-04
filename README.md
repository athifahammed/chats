# CHATS
A GitHub Pages + Supabase private messenger.

## New mobile/media features
- Mobile-first responsive UI and app-like layout
- Installable PWA shell
- Voice message recording and playback
- Image/file attachments up to 25 MB
- Browser notifications while the site is open/backgrounded
- Unread messages remain stored in Supabase across logout/login

## Supabase setup
Run the updated `supabase-schema.sql` in SQL Editor. Then create a Storage bucket named `chat-files` and make it **Public**. Add storage policies that allow authenticated users to upload/read objects in that bucket. Keep your `anon/public` key in `js/config.js`; never use `service_role` in the browser.

## Important about notifications
This version can notify you when the website is open or running in a background browser tab. True push notifications after the browser/site is completely closed require a Web Push service/backend (VAPID or a provider such as OneSignal). That can be added as the next upgrade.
