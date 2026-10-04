# MoxoChat

A personal real-time messaging website using GitHub Pages + Supabase.

## Features
- Email/password accounts
- User profiles
- Private 1-to-1 messages
- Real-time incoming messages
- Read timestamps
- Responsive mobile/desktop interface

## Setup

### 1. Create Supabase project
Create a project at https://supabase.com.

Open **SQL Editor**, paste `supabase-schema.sql`, and run it.

Then open **Project Settings → API** and copy:
- Project URL
- anon/public key

Put them into `js/config.js`.

### 2. Authentication
In Supabase, open **Authentication → Providers → Email** and enable Email.

For easy testing, you can disable email confirmation in the Auth settings. For a real public deployment, keep email confirmation enabled.

### 3. GitHub
Create a new GitHub repository and upload:
- index.html
- css/
- js/
- supabase-schema.sql
- README.md

Then open **Settings → Pages**:
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)

GitHub will give you a `github.io` website URL.

## Important security note
The browser uses the Supabase `anon` key. This is normal. Never put the Supabase `service_role` key in the website.

## Next upgrades
- Profile photos
- Typing indicator
- Online presence
- Image/file messages
- Message deletion
- Block users
- Group chats
- Push notifications
