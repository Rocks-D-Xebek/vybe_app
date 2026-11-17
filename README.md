# VYBE — Move different.

AI fitness, nutrition and lifestyle app. **Expo (React Native) app** in `app/` + `src/`, **PHP backend** in `backend/` on vibenews.in.

## 1. Backend (one-time, on HostingRaja)
1. Upload `backend/vybe-api.php` to `public_html/backend/`.
2. Your existing `config.php` keeps working. Optionally replace it with the fuller `backend/config.example.php` (lets you rename the coach and set limits).
3. Delete the old `public_html/backend/analyze_food.php` — the app no longer uses it.
4. Check: open https://vibenews.in/backend/vybe-api → you should see `{"error":"Use POST"}`.

## 2. Try the app on your phone (no build needed)
1. Install **Expo Go** from the Play Store.
2. On the PC, in this folder:
   ```bash
   npm install
   npm run tunnel
   ```
3. Scan the QR code shown in the terminal with Expo Go. `tunnel` works even if the phone and PC are on different networks.

## 3. Get an installable APK
Push to `main` → GitHub → **Actions** → **Build Android App** → when finished, download **vybe-apk** from the run → unzip → install `app-release.apk` on your phone.
This APK is signed with a test key: perfect for you and testers, not for Google Play (see step 4).

## 4. Google Play (later)
Needs an upload key and an `.aab` file — use EAS Build (`npx eas-cli build -p android`) or a signing key added to GitHub Secrets. Ask before doing this; the key must be kept safe forever.

## What works now
| Feature | Status |
|---|---|
| Food logging 4 ways: photo, nutrition-label photo, barcode (Open Food Facts), type it ("2 chakodi and chai") | ✅ AI via `vybe-api.php` |
| Full nutrition per meal: kcal, protein, carbs, fat, fibre, sugar, sodium; favourites & recents | ✅ |
| Workouts: quick (average) or detailed breakdown, calories burned from body weight | ✅ on the phone |
| XP & levels, Vybe Wrapped weekly share card, smart reminders | ✅ |
| Solo challenges with unique badges | ✅ from your own logs |
| Avatars, AI graffiti selfie banner (Gemini image) | ✅ via `vybe-api.php` |
| Premium: Mr. Vyb plan builder + daily "today's step", Global Race | ✅ behind a testing switch until RevenueCat (phase 3) |
| 1v1 / group challenges, friends, live video battles, login | 🔜 phase 2 (Supabase) |

## Artwork
All images in `assets/images/` were generated with Cloudflare Workers AI (FLUX.2) by `scripts/gen-images.mjs`.
To make new ones, set `CF_ACCOUNT_ID` and `CF_AI_TOKEN` as environment variables, add a prompt to the script, then:
```bash
node scripts/gen-images.mjs my-new-image
```

## Change things quickly
- Colours / look: `src/theme/ThemeContext.tsx`
- Coach name, AI models, rate limit: `config.php` on the server
- Backend URL: `app.json` → `expo.extra.apiUrl`
