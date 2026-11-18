<?php
require __DIR__ . '/_layout.php';
vybe_page('Privacy Policy', <<<HTML
<h1>Privacy Policy</h1>
<p class="muted">Last updated: 19 November 2026</p>
<p>This policy explains what the VYBE app ("VYBE", "we") collects, why, and the choices you have. VYBE is operated by VibeNews (vibenews.in), India.</p>

<h2>1. What we collect</h2>
<ul>
  <li><b>Account details</b>, if you create an account: name, email address, or phone number (WhatsApp login), and your Google profile name and picture if you sign in with Google.</li>
  <li><b>Profile</b>: username, display name, avatar, city and country (used for local, national and international challenges and leaderboards).</li>
  <li><b>Health and fitness data you enter</b>: meals and their nutrition, water, workouts, weight, sleep, mood, goals and plans.</li>
  <li><b>Photos you choose to analyse</b>: food, fridge, nutrition labels or a selfie for the graffiti avatar.</li>
  <li><b>Social activity</b>: friends, challenges, challenge entries and XP.</li>
  <li><b>Purchases</b>: whether you have VYBE Premium. Payments are handled by Google Play; we never see your card or bank details.</li>
</ul>

<h2>2. How we use it</h2>
<ul>
  <li>To run the app: calculate nutrition, show progress, back up your data and run challenges and leaderboards.</li>
  <li>To give AI features: photos and text you submit are sent to Google's Gemini AI service to estimate nutrition, answer Mr. Vyb chats, build plans or create your avatar. We do not store these photos on our servers.</li>
  <li>To send reminders you switch on (phone notifications, and WhatsApp messages only if you opt in).</li>
  <li>To prevent cheating and abuse (rate limits, flagged challenge entries).</li>
</ul>
<p>We do <b>not</b> sell your personal data and we do not use your health data for advertising.</p>

<h2>3. Where your data is stored and who processes it</h2>
<ul>
  <li><b>On your phone</b>: if you don't create an account, your data stays on your device.</li>
  <li><b>Supabase</b> (database and login, servers in Mumbai, India): your account, profile, social data and cloud backup.</li>
  <li><b>Google</b>: Gemini AI processing, Google Sign-In and Google Play billing.</li>
  <li><b>RevenueCat</b>: checks Premium subscription status.</li>
  <li><b>Open Food Facts</b>: barcode lookups (only the barcode number is sent).</li>
  <li><b>Twilio / Meta (WhatsApp)</b>: login codes and reminders, only if you use WhatsApp features.</li>
  <li><b>Our server at vibenews.in</b>: relays AI requests; it keeps no copies of your photos.</li>
</ul>

<h2>4. Who can see what</h2>
<p>Other VYBE users can see your public profile (username, display name, avatar, city, country, XP and Premium badge). Your challenge progress is visible only to people in the same challenge. Your meals, weight, sleep, mood and other health logs are private to you.</p>

<h2>5. Your choices and rights</h2>
<ul>
  <li><b>Delete your account</b> any time in the app: Profile → Delete my account. This permanently deletes your account, friends, challenges and cloud backup.</li>
  <li>Edit your profile, turn reminders on or off, and opt out of random matches in the app.</li>
  <li>Ask for a copy or correction of your data by emailing us.</li>
</ul>

<h2>6. Data retention</h2>
<p>We keep your data while your account exists. When you delete your account it is removed from our database straight away and from backups within 30 days.</p>

<h2>7. Children</h2>
<p>VYBE is not intended for children under 13, and we do not knowingly collect their data. Users under 18 should use VYBE with a parent's permission.</p>

<h2>8. Health disclaimer</h2>
<p>Nutrition values and AI advice are estimates for general fitness only and are not medical advice.</p>

<h2>9. Security</h2>
<p>Data is encrypted in transit (HTTPS). Database rules ensure each user can only access their own private data.</p>

<h2>10. Changes and contact</h2>
<p>We will post updates on this page and change the date above. Questions or requests: <a href="mailto:vibenews.shorts@gmail.com">vibenews.shorts@gmail.com</a>.</p>
HTML);
