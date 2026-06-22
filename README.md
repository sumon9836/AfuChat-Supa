<div align="center">
  <img src="artifacts/mobile/assets/images/logo.png" alt="AfuChat Logo" width="120" />
  <h1>AfuChat</h1>
  <p>WhatsApp-style real-time group & personal chat platform</p>

  ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
  ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
</div>

---

## বাংলা গাইড — সম্পূর্ণ Setup থেকে Deploy পর্যন্ত

এই গাইডে ধাপে ধাপে দেখানো হয়েছে কিভাবে:
1. **Supabase** সম্পূর্ণ সেটআপ করবে (Database + Google OAuth)
2. **Vercel**-এ website deploy করবে
3. **Admin** হিসেবে প্রথম user সেট করবে

---

## PART 1 — Supabase সেটআপ

### ধাপ ১ — Supabase Dashboard খোলো

1. ব্রাউজারে যাও: **https://supabase.com/dashboard**
2. Log in করো তোমার account দিয়ে
3. তোমার project select করো: **`airihsxtauwbwlkhegna`**

---

### ধাপ ২ — Database Schema তৈরি করো

1. বাম মেনুতে **SQL Editor** click করো
2. উপরে **"New query"** button click করো
3. নিচের SQL file-এর সব content copy করো:

   **File:** `supabase/migrations/20260700_afuchat_schema.sql`

4. SQL Editor-এ paste করো
5. **"Run"** button click করো (অথবা `Ctrl+Enter`)
6. "Success" message দেখলে বুঝবে সব ঠিকমতো হয়েছে

> এই SQL দিয়ে তৈরি হবে:
> - `profiles` — user info table
> - `conversations` — group ও DM chat table
> - `conversation_members` — কে কোন group-এ আছে
> - `messages` — সব chat message
> - `message_reactions` — emoji reactions
> - `notifications` — notification table
> - সব table-এ **Realtime** enabled থাকবে

---

### ধাপ ৩ — Google OAuth Enable করো

Google দিয়ে login করার জন্য এই steps follow করো:

#### ৩.১ — Google Cloud Console-এ project তৈরি করো

1. যাও: **https://console.cloud.google.com**
2. উপরে project dropdown থেকে **"New Project"** click করো
3. Project name দাও: `AfuChat` → **Create** click করো

#### ৩.২ — OAuth Consent Screen সেট করো

1. বাম মেনু → **APIs & Services** → **OAuth consent screen**
2. **External** select করো → **Create**
3. পূরণ করো:
   - **App name:** `AfuChat`
   - **User support email:** তোমার email
   - **Developer contact:** তোমার email
4. **Save and Continue** click করো (বাকি সব skip করা যাবে)

#### ৩.৩ — OAuth Credentials তৈরি করো

1. বাম মেনু → **APIs & Services** → **Credentials**
2. **"+ Create Credentials"** → **"OAuth client ID"** click করো
3. Application type: **Web application**
4. Name: `AfuChat Web`
5. **Authorized redirect URIs**-এ এই URL add করো:
   ```
   https://airihsxtauwbwlkhegna.supabase.co/auth/v1/callback
   ```
6. **Create** click করো
7. একটা popup আসবে — **Client ID** ও **Client Secret** কপি করে রাখো

#### ৩.৪ — Supabase-এ Google Provider Enable করো

1. Supabase Dashboard-এ যাও
2. বাম মেনু → **Authentication** → **Providers**
3. **Google** খুঁজে বের করো → toggle করে **Enable** করো
4. পূরণ করো:
   - **Client ID:** (Google থেকে কপি করা)
   - **Client Secret:** (Google থেকে কপি করা)
5. **Save** click করো

---

### ধাপ ৪ — Supabase Realtime চালু করো

1. Supabase Dashboard → **Database** → **Replication**
2. **"supabase_realtime"** publication দেখবে
3. নিশ্চিত করো এই tables গুলো সেখানে আছে:
   - `messages`
   - `conversations`
   - `conversation_members`
   - `message_reactions`
   - `notifications`

> যদি না থাকে, SQL Editor-এ এটা run করো:
> ```sql
> alter publication supabase_realtime add table public.messages;
> alter publication supabase_realtime add table public.conversations;
> alter publication supabase_realtime add table public.conversation_members;
> alter publication supabase_realtime add table public.message_reactions;
> alter publication supabase_realtime add table public.notifications;
> ```

---

## PART 2 — Vercel-এ Deploy করো

### ধাপ ১ — GitHub-এ Code Push করো

তোমার project code একটা GitHub repository-তে থাকতে হবে।

যদি না থাকে:
1. **https://github.com/new** যাও
2. New repository তৈরি করো (যেমন: `afuchat`)
3. Code push করো:
   ```bash
   git init
   git add .
   git commit -m "AfuChat initial"
   git remote add origin https://github.com/তোমার-username/afuchat.git
   git push -u origin main
   ```

---

### ধাপ ২ — Vercel Account তৈরি করো

1. যাও: **https://vercel.com**
2. **"Sign Up"** → GitHub দিয়ে login করো

---

### ধাপ ৩ — Project Import করো

1. Vercel Dashboard-এ **"Add New Project"** click করো
2. GitHub থেকে `afuchat` repository select করো → **Import**
3. **Configure Project** screen-এ:

   **Framework Preset:** Other (Vercel auto-detect করবে `vercel.json` থেকে)

   Build settings গুলো automatically set হয়ে যাবে:
   - Install Command: `pnpm install`
   - Build Command: `bash scripts/build-web.sh`
   - Output Directory: `artifacts/mobile/dist`

---

### ধাপ ৪ — Environment Variables Add করো

এটা সবচেয়ে গুরুত্বপূর্ণ ধাপ।

Vercel Dashboard → তোমার Project → **Settings** → **Environment Variables**

এই ৩টা variable add করো:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://airihsxtauwbwlkhegna.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpcmloc3h0YXV3Yndsa2hlZ25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTcwMDQsImV4cCI6MjA5NzYzMzAwNH0.MgF0A7JSA26Dl9zJY_iFJTtGtFB2wXtZwLro8Y94yRc` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Replit Secrets-এ যেটা save করেছ)* | Production, Preview, Development |

প্রতিটা variable add করার পর **Save** click করো।

---

### ধাপ ৫ — Deploy করো

1. **"Deploy"** button click করো
2. Build শুরু হবে — ৩-৫ মিনিট সময় লাগবে
3. Build শেষে Vercel একটা URL দেবে, যেমন:
   ```
   https://afuchat.vercel.app
   ```
4. এই URL-এ তোমার site live!

---

### ধাপ ৬ — Vercel URL Supabase-এ Add করো

Deploy হওয়ার পর Supabase-এ তোমার site URL add করতে হবে, না হলে Google OAuth কাজ করবে না।

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL** field-এ তোমার Vercel URL দাও:
   ```
   https://afuchat.vercel.app
   ```
3. **Redirect URLs**-এ এটা add করো:
   ```
   https://afuchat.vercel.app/**
   ```
4. **Save** click করো

---

## PART 3 — প্রথম Admin সেট করো

Website deploy হওয়ার পর তোমাকে প্রথমে **"Continue with Google"** দিয়ে login করতে হবে। তারপর নিজেকে admin করে নিতে হবে।

### ধাপ ১ — Profile খুঁজে বের করো

1. Supabase Dashboard → **Table Editor** → **profiles** table
2. তোমার নিজের row খুঁজে বের করো (email বা display_name দেখে)

### ধাপ ২ — Admin করো

1. তোমার row-এ `is_admin` column-টা **`true`** করো
2. **Save** click করো

অথবা SQL Editor-এ এটা run করো:
```sql
update public.profiles
set is_admin = true
where id = 'তোমার-user-id-এখানে';
```

User ID পাবে: Supabase → **Authentication** → **Users** → তোমার email-এর পাশে

---

## PART 4 — Website কিভাবে ব্যবহার করবে

### Admin হিসেবে:
- **Admin** tab থেকে Group ও Channel তৈরি করো
- User দের admin করতে পারবে
- Group/Channel edit ও delete করতে পারবে

### Normal User হিসেবে:
- Google দিয়ে login করলে automatically সব group-এ join হয়ে যাবে
- **Chats** tab-এ group ও personal chat দেখবে
- **People** tab-এ যেকোনো user search করে personal chat করতে পারবে
- **Profile** tab-এ নিজের info edit করতে পারবে

---

## Environment Variables Summary

| Variable | কোথায় লাগবে | কোথায় পাবে |
|----------|------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + Replit | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + Replit | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Replit Secrets | Supabase → Settings → API → service_role |

> **Note:** `SUPABASE_SERVICE_ROLE_KEY` সবসময় Secret হিসেবে রাখবে। এটা কখনো public করবে না।

---

## Custom Domain (Optional)

নিজের domain (যেমন `afuchat.com`) লাগাতে চাইলে:

1. Vercel → Project → **Settings** → **Domains**
2. তোমার domain add করো
3. DNS provider-এ Vercel-এর দেওয়া CNAME/A record add করো
4. Supabase → Authentication → URL Configuration-এ নতুন domain update করো
5. Google Cloud Console → OAuth credentials-এ নতুন redirect URI add করো:
   ```
   https://afuchat.com
   https://afuchat.com/**
   ```

---

## সমস্যা হলে

| সমস্যা | সমাধান |
|--------|--------|
| Google login কাজ করছে না | Supabase-এ Site URL ও Redirect URL সঠিক আছে কিনা দেখো |
| Build fail হচ্ছে | Vercel-এ ৩টা environment variable ঠিকমতো add হয়েছে কিনা দেখো |
| Chat দেখা যাচ্ছে না | Supabase SQL schema ঠিকমতো run হয়েছে কিনা দেখো |
| Realtime কাজ করছে না | Supabase → Database → Replication-এ tables add হয়েছে কিনা দেখো |

---

<div align="center">
  <p>Made with by AfuChat Team</p>
</div>
