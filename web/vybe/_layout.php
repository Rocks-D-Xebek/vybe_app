<?php
// Shared look for VYBE's public pages (home, privacy, terms). Upload the whole folder to public_html/vybe/
function vybe_page(string $title, string $body): void {
    header('Content-Type: text/html; charset=utf-8'); ?>
<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= htmlspecialchars($title) ?> · VYBE</title>
<meta name="description" content="VYBE: AI fitness, nutrition and challenges. Move different.">
<style>
  :root{--bg:#07070B;--card:#111118;--text:#F4F4F8;--sub:#A9A9BE;--lime:#C8FF00;--purple:#A855F7}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  header{padding:20px 16px;border-bottom:1px solid #222;display:flex;gap:16px;align-items:center;max-width:860px;margin:0 auto}
  .logo{font-weight:900;font-size:28px;letter-spacing:1px}.logo span{color:var(--lime);font-size:14px;display:block;letter-spacing:0}
  nav{margin-left:auto;display:flex;gap:14px;font-size:14px}a{color:var(--lime)}
  main{max-width:860px;margin:0 auto;padding:24px 16px 60px}h1{font-size:30px;margin:8px 0 4px}h2{margin-top:30px;font-size:20px;color:var(--lime)}
  .muted{color:var(--sub);font-size:14px}.card{background:var(--card);border:1px solid #222;border-radius:18px;padding:18px;margin:16px 0}
  ul{padding-left:20px}li{margin:4px 0}footer{text-align:center;color:var(--sub);font-size:13px;padding:30px 16px;border-top:1px solid #222}
</style></head>
<body>
<header><div class="logo">VYBE<span>Move different.</span></div>
<nav><a href="/vybe">Home</a><a href="/vybe/privacy">Privacy</a><a href="/vybe/terms">Terms</a></nav></header>
<main><?= $body ?></main>
<footer>© <?= date('Y') ?> VYBE · a VibeNews product · Contact: <a href="mailto:vibenews.shorts@gmail.com">vibenews.shorts@gmail.com</a></footer>
</body></html>
<?php }
