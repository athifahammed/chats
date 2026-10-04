# CHATS

Phone-first private messaging website using GitHub Pages + Supabase.

## Important upgrade step
Run `supabase-schema.sql` in Supabase SQL Editor before using the new app. It adds `message_type`, file fields, profile picture, and last-active fields to an existing database.

## Keep your Supabase config
Keep the `js/config.js` file from your currently working CHATS website. Do not replace it with a placeholder config.

## Features
- Mobile-first responsive UI
- Dark, light, purple, blue and green themes
- Profile name, picture and password settings
- Online green dot / Active now
- Last active time when offline
- Seen status on sent messages
- Text, image/file and voice messages
- Supabase Realtime messaging
- Browser notifications while supported by the browser
- PWA manifest/service worker
