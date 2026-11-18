<?php
// Invite landing page for links shared on WhatsApp/Instagram: https://vibenews.in/backend/vybe-invite?c=CODE
// Opens the VYBE app if installed (vybe://invite/CODE), otherwise sends people to Google Play.
$code = preg_replace('/[^a-z0-9]/', '', strtolower($_GET['c'] ?? ''));
$app  = 'vybe://invite/' . $code;
$play = 'https://play.google.com/store/apps/details?id=in.vibenews.vybe';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
?><!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Join me on VYBE</title>
<meta property="og:title" content="Join me on VYBE 🏁">
<meta property="og:description" content="Track food with AI, challenge friends and move different.">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#07070B;color:#F4F4F8;font-family:system-ui,sans-serif;text-align:center}
  .c{padding:28px;max-width:380px}.l{font-size:56px;font-weight:900;letter-spacing:2px}.t{color:#C8FF00;font-weight:800;margin:4px 0 22px}
  a{display:block;margin:12px 0;padding:16px;border-radius:16px;font-weight:900;text-decoration:none}
  .p{background:linear-gradient(90deg,#C8FF00,#A855F7);color:#07070B}.s{border:2px solid #C8FF00;color:#C8FF00}
</style></head>
<body><div class="c">
  <div class="l">VYBE</div><div class="t">Move different.</div>
  <p>Your friend invited you to battle on VYBE. Open the app to accept.</p>
  <a class="p" href="<?= htmlspecialchars($app) ?>">Open in VYBE</a>
  <a class="s" href="<?= htmlspecialchars($play) ?>">Get VYBE on Google Play</a>
</div>
<script>setTimeout(function(){ location.href = <?= json_encode($app) ?>; }, 300);</script>
</body></html>
