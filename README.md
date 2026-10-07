# CHATS — Simple Chat App

## 1. Supabase
Create/open a Supabase project.

Go to SQL Editor and run `supabase-schema.sql` once.

Then go to:
Authentication → Providers → Email

Enable Email provider.

For easiest testing, you may turn OFF email confirmation:
Authentication → Providers → Email → Confirm email → OFF

## 2. Add Supabase keys
Open `js/config.js`.

Replace:
PASTE_YOUR_SUPABASE_URL_HERE
PASTE_YOUR_SUPABASE_ANON_KEY_HERE

Use:
Project Settings → API → Project URL
Project Settings → API → Publishable/anon key

Never put your service_role key in this website.

## 3. Run
You do not need npm.

You can test locally with any simple static server, or deploy the folder to GitHub Pages.

## Features
- Login
- Create account
- Private 1-to-1 chat
- Realtime messages
- Seen status
- Online / last seen
- Search users
- Daily date separators
- Profile name
- Theme settings
- Browser notification permission
- Desktop responsive layout
- Mobile responsive layout including 412px width

No voice messages and no file uploads.
