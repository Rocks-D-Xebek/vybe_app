# Switching on accounts, challenges and Premium

The app works fully offline until these are set up. Do them in order. Each step is a few minutes.
**Never paste secret keys in chat.** Only the "anon / publishable" Supabase key and the RevenueCat `goog_…` key go in the app.

---

## 1. Supabase (accounts, friends, challenges, backup)
1. supabase.com → **New project** → name `vybe`, region **Mumbai (ap-south-1)**, save the database password somewhere safe.
2. **SQL Editor → New query** → paste everything from `supabase/migrations/0001_vybe_social.sql` → **Run**. You should see "Success".
3. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key into `app.json`:
   ```json
   "extra": {
     "supabaseUrl": "https://xxxx.supabase.co",
     "supabaseAnonKey": "eyJ... or sb_publishable_..."
   }
   ```
4. **Authentication → URL Configuration → Redirect URLs** → add: `vybe://**` and `exp://**`

### Email code login
**Authentication → Emails → Templates → Magic Link**: make the email show the code, e.g.
`Your VYBE code is {{ .Token }}`
Supabase's built-in email sender only allows a few emails per hour. Before launch, add your own SMTP under
**Authentication → Emails → SMTP** (your HostingRaja mailbox, or a free service like Brevo/Resend).

### Google login
1. console.cloud.google.com → new project "VYBE" → **APIs & Services → OAuth consent screen** → External → app name VYBE, your email.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorised redirect URI: `https://xxxx.supabase.co/auth/v1/callback` (your project URL + `/auth/v1/callback`).
3. Copy the Client ID and Client secret into **Supabase → Authentication → Providers → Google** → Enable → Save.

### WhatsApp login (optional, can come later)
Needs a Twilio account with a WhatsApp sender (Meta business verification can take a few days).
**Supabase → Authentication → Providers → Phone** → Enable → Provider **Twilio Verify** → paste Account SID, Auth Token,
Verify Service SID, and enable the WhatsApp channel in Twilio Verify. Until then the app tells users to use Google or email.

---

## 2. Server (`public_html/backend/`)
Upload from `D:\VYBE\backend\`: `vybe-api.php`, `vybe-invite.php`, `revenuecat-webhook.php`.
Add to your server `config.php` (see `config.example.php`):
```php
'SUPABASE_URL'              => 'https://xxxx.supabase.co',
'SUPABASE_SERVICE_KEY'      => '...service_role / secret key from Supabase → Settings → API...',
'REVENUECAT_WEBHOOK_SECRET' => 'any long random password you make up',
```
Check: https://vibenews.in/backend/vybe-invite?c=test shows the VYBE invite page.

---

## 3. Premium payments (RevenueCat + Google Play)
Do this when the app is uploaded to Play Console (internal testing is enough).
1. **Play Console → your app → Monetize → Subscriptions** → create `vybe_premium` with monthly (e.g. ₹199) and yearly base plans.
2. app.revenuecat.com → new project → **Add app → Google Play** → package `in.vibenews.vybe` → upload the Play service-account JSON (RevenueCat shows how).
3. RevenueCat → **Entitlements** → create `premium` → attach the subscription products.
   **Offerings** → `default` → add Monthly and Annual packages.
4. RevenueCat → **API keys** → copy the **Google public SDK key** (`goog_...`) into `app.json` → `"revenuecatAndroidKey"`.
5. RevenueCat → **Integrations → Webhooks** → URL `https://vibenews.in/backend/revenuecat-webhook`,
   Authorization header = the same `REVENUECAT_WEBHOOK_SECRET`.

Testing Premium before payments: in Supabase → **Table Editor → profiles** → set `is_premium` to `true` for your account.

---

## 4. Build
Commit/push → GitHub Actions builds the APK. Payments (RevenueCat) only work in the APK, not in Expo Go.

## What's enforced on the server
- Free: 1v1 only; must be friends; same city unlimited; 5 national + 3 international **new** challenges per calendar month;
  login streak 7 days → +1 national, 30 days → +3 national +2 international; random matches in your own city.
- Premium: anyone, anywhere, unlimited, group challenges; free friends join groups as guests and drop out when the event ends.
- Opponents can flag fake entries (flagged entries stop counting). Account deletion is built in (required by Google Play).
