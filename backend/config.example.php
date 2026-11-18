<?php
// Copy this file to config.php on your server (same folder as vybe-api.php)
// and put your real key in it. config.php is git-ignored so the key never reaches GitHub.
return [
    'GEMINI_API_KEY'      => 'PASTE_YOUR_NEW_GEMINI_KEY_HERE',
    'COACH_NAME'          => 'Mr. Vyb',          // rename the coach here
    'MODEL_FAST'          => 'gemini-3.6-flash', // chat, scans, fridge (fast)
    'MODEL_STRONG'        => 'gemini-3.8-flash',   // newer Flash, used to re-check low-confidence food scans
    'MODEL_BACKUP'        => 'gemini-3.5-flash-lite', // used automatically if the main model fails
    'MODEL_IMAGE'         => 'gemini-3.1-flash-image', // redraws profile photos in graffiti style
    // ---- Phase 2 (accounts & Premium) ----
    'SUPABASE_URL'              => 'https://YOUR-PROJECT.supabase.co',
    'SUPABASE_SERVICE_KEY'      => 'PASTE_SERVICE_ROLE_SECRET_HERE',   // SECRET: server only, never in the app
    'REVENUECAT_WEBHOOK_SECRET' => 'MAKE_UP_A_LONG_RANDOM_PASSWORD',
    'RATE_LIMIT_PER_HOUR' => 60,                 // AI requests per phone/IP per hour
];
