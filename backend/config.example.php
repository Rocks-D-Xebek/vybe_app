<?php
// Copy this file to config.php on your server (same folder as vybe-api.php)
// and put your real key in it. config.php is git-ignored so the key never reaches GitHub.
return [
    'GEMINI_API_KEY'      => 'PASTE_YOUR_NEW_GEMINI_KEY_HERE',
    'COACH_NAME'          => 'Mr. Vyb',          // rename the coach here
    'MODEL_FAST'          => 'gemini-2.5-flash', // chat, scans, fridge
    'MODEL_STRONG'        => 'gemini-2.5-pro',   // retry for low-confidence food scans
    'RATE_LIMIT_PER_HOUR' => 60,                 // AI requests per phone/IP per hour
];
