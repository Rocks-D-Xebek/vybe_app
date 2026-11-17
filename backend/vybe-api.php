<?php
/**
 * VYBE API – single endpoint for the mobile app.
 * POST JSON: { "action": "food_scan" | "fridge_analyze" | "coach_chat", ... }
 *
 * Upload this file + config.php to public_html/backend/ on vibenews.in.
 * The app calls https://vibenews.in/backend/vybe-api (no .php → no .htaccess redirect).
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { fail(405, 'Use POST'); }

$T0 = microtime(true);   // whole request must finish before Cloudflare's 100 s timeout

// Nutrition fields every food answer must contain
const FOOD_ITEM_SCHEMA = '{"name":string,"estimatedQuantity":string,"cookingMethodGuess":string,'
  . '"confidence":"high|medium|low","estimatedCalories":number,"proteinG":number,"carbsG":number,'
  . '"fatG":number,"fiberG":number,"sugarG":number,"sodiumMg":number}';

// ---------- Config ----------
$config = file_exists(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$API_KEY      = getenv('GEMINI_API_KEY') ?: ($config['GEMINI_API_KEY'] ?? '');
$COACH_NAME   = $config['COACH_NAME']   ?? 'Mr. Vyb';
$MODEL_FAST   = $config['MODEL_FAST']   ?? 'gemini-3.6-flash';
$MODEL_STRONG = $config['MODEL_STRONG'] ?? 'gemini-3.8-flash';
$MODEL_BACKUP = $config['MODEL_BACKUP'] ?? 'gemini-3.5-flash-lite'; // used when the main model fails
$MODEL_IMAGE  = $config['MODEL_IMAGE']  ?? 'gemini-3.1-flash-image'; // profile photo makeover
$RATE_LIMIT   = (int)($config['RATE_LIMIT_PER_HOUR'] ?? 60);
if (!$API_KEY) { fail(500, 'Server is missing GEMINI_API_KEY'); }

// ---------- Input ----------
$raw = file_get_contents('php://input', false, null, 0, 25 * 1024 * 1024);
$in = json_decode($raw, true);
if (!is_array($in)) { fail(400, 'Invalid JSON'); }
rate_limit($RATE_LIMIT);

switch ($in['action'] ?? '') {
    case 'food_scan':      food_scan($in); break;
    case 'fridge_analyze': fridge_analyze($in); break;
    case 'coach_chat':     coach_chat($in); break;
    case 'food_text':      food_text($in); break;
    case 'food_info':      food_info($in); break;
    case 'food_label':     food_label($in); break;
    case 'plan_chat':      plan_chat($in); break;
    case 'avatar_makeover': avatar_makeover($in); break;
    default:               fail(400, 'Unknown action');
}

// ================= Actions =================

function food_scan(array $in): void {
    global $MODEL_FAST, $MODEL_STRONG;
    $img = clean_b64($in['imageBase64'] ?? '');
    $cat = preg_replace('/[^a-z]/', '', strtolower((string)($in['mealCategory'] ?? 'unknown')));
    $prompt = <<<TXT
You are a nutrition estimation engine. Analyse the food photo and return STRICT JSON only:
{"items":[ITEM],"overallConfidence":"high|medium|low","uncertaintyNote":string}
where ITEM = FOOD_ITEM_SCHEMA
Rules: a photo cannot reliably reveal exact food weight, hidden oil or precise ingredients.
Use conservative confidence and always explain limitations in uncertaintyNote.
Indian dishes are common – name them specifically (e.g. "Paneer butter masala", "Masala dosa").
For packaged snacks (chips, biscuits, namkeen), read the brand/label if visible and estimate per visible portion or pack.
If there is no food in the photo, return {"items":[],"overallConfidence":"low","uncertaintyNote":"No food detected"}.
TXT;
    $prompt = str_replace('FOOD_ITEM_SCHEMA', FOOD_ITEM_SCHEMA, $prompt);
    $parts = [img_part($img), ['text' => "Meal category: $cat. Estimate this meal."]];
    $result = gemini_json($MODEL_FAST, $prompt, [['role' => 'user', 'parts' => $parts]]);
    if (($result['overallConfidence'] ?? '') === 'low' && !empty($result['items']) && microtime(true) - $GLOBALS['T0'] < 35) {
        $retry = gemini_json($MODEL_STRONG, $prompt, [['role' => 'user', 'parts' => $parts]], false);
        if ($retry) { $result = $retry; $result['retriedWithPro'] = true; }
    }
    ok(finish_food($result));
}


function finish_food(array $result): array {
    $result['items'] = array_values(array_map('normalize_item', $result['items'] ?? []));
    $result['overallConfidence'] = $result['overallConfidence'] ?? 'low';
    $result['uncertaintyNote'] = (string)($result['uncertaintyNote'] ?? 'Estimates only – please check.');
    return $result;
}

/** User types what they ate ("Chilli potato chips 100 g", "2 chakodi and chai") – AI works out nutrition. */
function food_text(array $in): void {
    global $MODEL_FAST;
    $text = trim(mb_substr((string)($in['text'] ?? ''), 0, 500));
    if ($text === '') fail(400, 'Tell me what you ate');
    $schema = FOOD_ITEM_SCHEMA;
    $prompt = <<<TXT
You are a nutrition estimation engine for an Indian fitness app. The user describes what they ate in plain words
(any language mix, e.g. Hinglish or Telugu words for dishes). Split it into separate food items and estimate nutrition.
Return STRICT JSON only: {"items":[ITEM],"overallConfidence":"high|medium|low","uncertaintyNote":string}
where ITEM = $schema
Rules: use the quantity the user gave (grams, pieces, cups, plates). If no quantity, assume one typical Indian
serving and say so in estimatedQuantity. Know Indian street food and snacks (chakodi, murukku, samosa, pani puri,
vada pav, bajji, mixture, chilli potato chips and so on). Be realistic about oil in fried foods. Never return an
empty list for real food.
TXT;
    $r = gemini_json($MODEL_FAST, $prompt, [['role' => 'user', 'parts' => [['text' => $text]]]]);
    ok(finish_food($r));
}

/** Nutrition per 100 g + household portion sizes for ONE food the built-in list doesn't have. */
function food_info(array $in): void {
    global $MODEL_FAST;
    $name = trim(mb_substr((string)($in['name'] ?? ''), 0, 120));
    if ($name === '') fail(400, 'Food name required');
    $prompt = <<<TXT
You are a nutrition database for an Indian fitness app. For the ONE food the user names, return typical values
for the food as normally eaten (cooked/prepared) in India. Return STRICT JSON only:
{"name":string,"per100":{"kcal":number,"p":number,"c":number,"f":number,"fib":number,"sug":number,"na":number},
 "units":{UNIT:grams},"defaultUnit":string,"defaultQty":number}
per100 = per 100 g: kcal, protein g, carbs g, fat g, fibre g, sugar g, sodium mg.
units: only portion words that make sense for this food, from: piece, katori, bowl, plate, cup, glass, tbsp, tsp,
slice, handful, pack, scoop, can - each mapped to its typical weight in grams (a katori is usually 120-150 g, a bowl
200-250 g, a glass 250 ml). defaultUnit = the way people usually count it; defaultQty usually 1.
"name" = a clean, properly capitalised food name. If it is not a food, return {"name":"","per100":null}.
TXT;
    $r = gemini_json($MODEL_FAST, $prompt, [['role' => 'user', 'parts' => [['text' => $name]]]]);
    if (empty($r['name']) || !is_array($r['per100'] ?? null)) fail(422, "I don't know \"$name\" as a food. Try another name.");
    $n = $r['per100'];
    $units = [];
    foreach ((array)($r['units'] ?? []) as $u => $g) {
        if (preg_match('/^[a-z]{1,10}$/', (string)$u) && (float)$g > 0 && (float)$g < 3000) $units[$u] = round((float)$g, 1);
    }
    $def = (string)($r['defaultUnit'] ?? '');
    if (!isset($units[$def])) $def = $units ? array_key_first($units) : 'g';
    ok([
        'name' => mb_substr((string)$r['name'], 0, 80),
        'per100' => [
            'kcal' => max(0, (float)($n['kcal'] ?? 0)), 'p' => max(0, (float)($n['p'] ?? 0)), 'c' => max(0, (float)($n['c'] ?? 0)),
            'f' => max(0, (float)($n['f'] ?? 0)), 'fib' => max(0, (float)($n['fib'] ?? 0)), 'sug' => max(0, (float)($n['sug'] ?? 0)),
            'na' => max(0, (float)($n['na'] ?? 0)),
        ],
        'units' => (object)$units,
        'defaultUnit' => $def,
        'defaultQty' => $def === 'g' ? 100 : max(0.5, (float)($r['defaultQty'] ?? 1)),
    ]);
}

/** Photo of a packet's nutrition table + how much the user ate. */
function food_label(array $in): void {
    global $MODEL_FAST;
    $img = clean_b64($in['imageBase64'] ?? '');
    $amount = trim(mb_substr((string)($in['amountText'] ?? ''), 0, 120));
    if ($amount === '') $amount = 'one full pack';
    $name = trim(mb_substr((string)($in['name'] ?? ''), 0, 120));
    $schema = FOOD_ITEM_SCHEMA;
    $prompt = <<<TXT
You read nutrition-facts tables on Indian food packets (values are usually "per 100 g" and/or "per serving").
Read the table in the photo exactly, then calculate the nutrition for the amount the user ate.
Return STRICT JSON only: {"items":[ITEM],"overallConfidence":"high|medium|low","uncertaintyNote":string,"per100g":{"calories":number,"proteinG":number,"carbsG":number,"fatG":number,"fiberG":number,"sugarG":number,"sodiumMg":number}}
where ITEM = $schema (exactly one item; estimatedQuantity = the amount eaten).
If a value is missing on the label use 0 and mention it in uncertaintyNote. If the photo is not a nutrition table,
return {"items":[],"overallConfidence":"low","uncertaintyNote":"No nutrition table found - take a clear photo of the table"}.
TXT;
    $q = "Amount eaten: $amount." . ($name !== '' ? " Product: $name." : '');
    $r = gemini_json($MODEL_FAST, $prompt, [['role' => 'user', 'parts' => [img_part($img), ['text' => $q]]]]);
    $out = finish_food($r);
    if (isset($r['per100g']) && is_array($r['per100g'])) $out['per100g'] = $r['per100g'];
    ok($out);
}

/**
 * Premium plan builder. Mr. Vyb chats like a mentor, asks what he needs, then returns a full plan.
 * Response: {"reply": string, "plan": null | PLAN}
 */
function plan_chat(array $in): void {
    global $MODEL_STRONG, $COACH_NAME;
    $contents = chat_contents($in['messages'] ?? []);
    $ctx = json_encode(is_array($in['userContext'] ?? null) ? $in['userContext'] : [], JSON_PRETTY_PRINT);
    $system = <<<TXT
You are $COACH_NAME, VYBE's AI fitness coach, building a personal plan with the user like a friendly mentor.
Goal types: weight loss, weight gain, muscle gain, general fitness, endurance/running, or anything fitness related.
STEP 1 - Converse. Ask ONE or TWO short questions per message (Gen-Z friendly, warm, never preachy) until you know:
goal + target + timeframe, age, sex, height, current weight, activity level, workout place (home/gym/outdoor) and
equipment, days per week and minutes per session, diet type (veg/eggetarian/non-veg/vegan/Jain), allergies or
health conditions, foods they love or hate, budget, usual meal times. Use the authorised data below instead of asking again.
STEP 2 - When you have enough, build the plan. Be precise: calculate BMR (Mifflin-St Jeor), TDEE and a safe daily
calorie target (max 20% deficit, or +250 to +500 kcal for gain), macros in grams, fibre and water. Indian-friendly meals.
Progressive workouts with sets x reps or minutes. Safety first; suggest a doctor for medical conditions.
ALWAYS return STRICT JSON: {"reply": string, "plan": null | PLAN}
While still asking questions, "plan" is null. When the plan is ready, "reply" is a short hype message and PLAN =
{"title":string,"goal":string,"summary":string,"durationWeeks":number,
 "targets":{"calories":number,"proteinG":number,"carbsG":number,"fatG":number,"fiberG":number,"waterMl":number,"activeMin":number},
 "weekly":[{"day":"Mon|Tue|Wed|Thu|Fri|Sat|Sun","focus":string,"workout":{"title":string,"minutes":number,"exercises":[string]},"tip":string}],
 "meals":[{"slot":"breakfast|lunch|snack|dinner","time":"HH:MM","options":[string]}],
 "rules":[string]}
"weekly" must have all 7 days (rest days included). Keep exercises as short strings like "Squats 3x12".
Authorised user data:
$ctx
TXT;
    $text = gemini_call($MODEL_STRONG, $system, $contents, ['temperature' => 0.6, 'responseMimeType' => 'application/json']);
    $j = json_decode(trim(str_replace(['```json', '```'], '', $text)), true);
    if (!is_array($j) || !isset($j['reply'])) { ok(['reply' => trim($text), 'plan' => null]); }
    ok(['reply' => (string)$j['reply'], 'plan' => is_array($j['plan'] ?? null) ? $j['plan'] : null]);
}

/** Redraws the user's photo as a VYBE graffiti banner using Gemini image generation. */
function avatar_makeover(array $in): void {
    global $MODEL_IMAGE;
    $img = clean_b64($in['imageBase64'] ?? '');
    $prompt = 'Redraw the person in this photo as a bold Gen-Z streetwear graffiti illustration. Keep their face, '
        . 'hairstyle, skin tone and expression recognisable. Black hoodie with neon lime trim, big headphones. '
        . 'Comic ink outlines, spray-paint splashes in neon lime green, purple and hot magenta, small doodled '
        . 'crowns and lightning bolts, deep black background. Wide 3:2 banner: person on the RIGHT half, empty dark '
        . 'space on the left. No text, no letters, no logos.';
    $payload = json_encode([
        'contents' => [['role' => 'user', 'parts' => [img_part($img), ['text' => $prompt]]]],
        'generationConfig' => ['responseModalities' => ['TEXT', 'IMAGE']],
    ]);
    [$status, $resp, $err] = gemini_http($MODEL_IMAGE, $payload, 80);
    if (!$resp || $status >= 400) fail(500, gemini_error_message($status, (string)$resp, $err, $MODEL_IMAGE));
    $data = json_decode($resp, true);
    foreach ($data['candidates'][0]['content']['parts'] ?? [] as $p) {
        $d = $p['inlineData'] ?? $p['inline_data'] ?? null;
        if ($d && !empty($d['data'])) {
            ok(['imageBase64' => $d['data'], 'mimeType' => $d['mimeType'] ?? $d['mime_type'] ?? 'image/png']);
        }
    }
    fail(500, 'Could not create your graffiti look - try a clearer, well-lit photo of your face.');
}


function fridge_analyze(array $in): void {
    global $MODEL_FAST;
    $imgs = $in['imagesBase64'] ?? [];
    if (!is_array($imgs) || count($imgs) === 0) { fail(400, 'imagesBase64 required'); }
    $parts = [];
    foreach (array_slice($imgs, 0, 3) as $b64) { $parts[] = img_part(clean_b64($b64)); }
    $parts[] = ['text' => 'Identify all visible ingredients across these fridge photos.'];
    $prompt = <<<TXT
You are an ingredient-detection engine. Analyse the fridge photo(s) and return STRICT JSON only:
{"confirmedIngredients":[{"name":string,"confidence":"high|medium"}],
"uncertainItems":[{"name":string,"question":string}]}
Only mark an ingredient confirmed if clearly visible. For anything ambiguous (paneer vs tofu,
similar containers), put it in uncertainItems with a short targeted question.
TXT;
    $r = gemini_json($MODEL_FAST, $prompt, [['role' => 'user', 'parts' => $parts]]);
    ok([
        'confirmedIngredients' => array_values($r['confirmedIngredients'] ?? []),
        'uncertainItems'       => array_values($r['uncertainItems'] ?? []),
    ]);
}

function coach_chat(array $in): void {
    global $MODEL_FAST, $COACH_NAME;
    $contents = chat_contents($in['messages'] ?? []);

    $ctx = json_encode(is_array($in['userContext'] ?? null) ? $in['userContext'] : [], JSON_PRETTY_PRINT);
    $system = <<<TXT
You are $COACH_NAME, the personal AI fitness and nutrition coach inside VYBE, a fitness app for a Gen-Z audience.
Personality:
- Natural, engaging Gen-Z language — but do NOT force slang into every sentence.
- You are a fitness and nutrition coach, NOT a generic chatbot and NOT a chef.
- Adapt tone: energetic when motivating, empathetic when the user struggles, knowledgeable and
  straightforward for technical questions, non-judgmental when goals are missed, celebratory at milestones.
- Never present missing data as poor performance.
- Never claim exact values from photos — always communicate uncertainty.
- No medical advice; suggest a qualified professional when relevant.
- Keep replies under ~120 words unless the user asks for detail.
- If activePlan is set, you are coaching them through THAT plan: keep advice consistent with it and naturally mention
  today's step (e.g. "We're taking the next step towards our goal. Today we do...").
Authorised user data (use it, never ask the user to repeat it):
$ctx
TXT;
    $text = gemini_call($MODEL_FAST, $system, $contents, ['temperature' => 0.7]);
    ok(['reply' => trim($text)]);
}

// ================= Helpers =================

function chat_contents($msgs): array {
    if (!is_array($msgs) || count($msgs) === 0 || count($msgs) > 60) { fail(400, 'Invalid messages'); }
    $contents = [];
    foreach ($msgs as $m) {
        $role = (($m['role'] ?? '') === 'model') ? 'model' : 'user';
        $text = mb_substr((string)($m['text'] ?? ''), 0, 2000);
        if ($text === '') continue;
        $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
    }
    // Gemini requires the conversation to start with a user turn
    while ($contents && $contents[0]['role'] === 'model') { array_shift($contents); }
    if (!$contents) { fail(400, 'Invalid messages'); }
    return $contents;
}

function gemini_call(string $model, string $system, array $contents, array $genConfig, bool $failHard = true): ?string {
    global $MODEL_BACKUP;
    $payload = json_encode([
        'systemInstruction' => ['parts' => [['text' => $system]]],
        'contents' => $contents,
        'generationConfig' => $genConfig,
    ]);
    // Reliability: retry the main model on temporary errors, then switch to the backup model.
    $plan = [[$model, 0], [$model, 1]];
    if ($MODEL_BACKUP && $MODEL_BACKUP !== $model) { $plan[] = [$MODEL_BACKUP, 0]; }
    $deadline = $GLOBALS['T0'] + 85;   // shared budget, stays under Cloudflare's 100 s limit
    $last = [0, '', '', $model];

    foreach ($plan as [$m, $wait]) {
        $left = $deadline - microtime(true);
        if ($left < 8) break;
        if ($wait) sleep(2);
        [$status, $resp, $curlErr] = gemini_http($m, $payload, (int)min(40, $left));
        if ($resp && $status < 400) {
            $data = json_decode($resp, true);
            $text = '';
            // Newer Gemini models can return "thought" parts – keep only the real answer
            foreach ($data['candidates'][0]['content']['parts'] ?? [] as $p) {
                if (!empty($p['thought'])) continue;
                $text .= $p['text'] ?? '';
            }
            if ($text !== '') return $text;
            $reason = $data['candidates'][0]['finishReason'] ?? ($data['promptFeedback']['blockReason'] ?? 'unknown');
            if (in_array($reason, ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST'])) {
                if ($failHard) fail(422, 'Mr. Vyb can\'t help with that one.');
                return null;
            }
            $last = [500, '', "empty answer ($reason)", $m];
            continue;
        }
        error_log("VYBE gemini $m error $status $curlErr: " . substr((string)$resp, 0, 300));
        $last = [$status, (string)$resp, $curlErr, $m];
        // Key problems won't fix themselves – stop immediately
        if ($status === 401 || $status === 403 || ($status === 400 && stripos((string)$resp, 'API key') !== false)) break;
    }
    if ($failHard) fail(500, gemini_error_message(...$last));
    return null;
}

function gemini_http(string $model, string $payload, int $timeout): array {
    global $API_KEY;
    $ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $API_KEY],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => max(5, $timeout),
    ]);
    $resp = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return [$status, $resp === false ? '' : $resp, $err];
}

function gemini_json(string $model, string $system, array $contents, bool $failHard = true): ?array {
    $text = gemini_call($model, $system, $contents,
        ['temperature' => 0.2, 'responseMimeType' => 'application/json'], $failHard);
    if ($text === null) return null;
    $text = trim(str_replace(['```json', '```'], '', $text));
    $json = json_decode($text, true);
    if (!is_array($json)) {
        if ($failHard) fail(500, 'Could not read AI response');
        return null;
    }
    return $json;
}

/** Human-readable reason, without ever exposing the API key. */
function gemini_error_message(int $status, string $resp, string $curlErr, string $model): string {
    if ($status === 0) return 'Server could not reach Google AI' . ($curlErr ? " ($curlErr)" : '');
    $msg = json_decode($resp, true)['error']['message'] ?? '';
    if ($status === 429) return 'Mr. Vyb is busy right now (Gemini quota). Try again in a minute.';
    if ($status === 404) return "Gemini model '$model' not found – check MODEL_FAST / MODEL_STRONG in config.php";
    if (stripos($msg, 'API key') !== false || $status === 403)
        return 'Gemini API key rejected – put a valid key in config.php';
    return "Gemini error $status" . ($msg ? ': ' . mb_substr($msg, 0, 160) : '');
}

function normalize_item($i): array {
    $i = is_array($i) ? $i : [];
    return [
        'name' => (string)($i['name'] ?? 'Food'),
        'estimatedQuantity' => (string)($i['estimatedQuantity'] ?? ''),
        'cookingMethodGuess' => (string)($i['cookingMethodGuess'] ?? ''),
        'confidence' => in_array($i['confidence'] ?? '', ['high', 'medium', 'low']) ? $i['confidence'] : 'low',
        'estimatedCalories' => max(0, (float)($i['estimatedCalories'] ?? 0)),
        'proteinG' => max(0, (float)($i['proteinG'] ?? 0)),
        'carbsG' => max(0, (float)($i['carbsG'] ?? 0)),
        'fatG' => max(0, (float)($i['fatG'] ?? 0)),
        'fiberG' => max(0, (float)($i['fiberG'] ?? 0)),
        'sugarG' => max(0, (float)($i['sugarG'] ?? 0)),
        'sodiumMg' => max(0, (float)($i['sodiumMg'] ?? 0)),
    ];
}

function clean_b64($b64): string {
    $b64 = preg_replace('#^data:image/\w+;base64,#', '', (string)$b64);
    if ($b64 === '' || strlen($b64) > 8 * 1024 * 1024 || !preg_match('#^[A-Za-z0-9+/=\r\n]+$#', $b64)) {
        fail(400, 'Invalid or too large image');
    }
    return $b64;
}

function img_part(string $b64): array {
    return ['inline_data' => ['mime_type' => 'image/jpeg', 'data' => $b64]];
}

/** Simple per-IP limit, stored outside the web root (system temp dir). */
function rate_limit(int $perHour): void {
    if ($perHour <= 0) return;
    // Behind Cloudflare, REMOTE_ADDR is Cloudflare's server – the real phone IP is in CF-Connecting-IP.
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $file = sys_get_temp_dir() . '/vybe_rl_' . md5($ip);
    $now = time();
    $hits = [];
    $fh = @fopen($file, 'c+');
    if (!$fh) return; // never block users because of a temp-dir problem
    flock($fh, LOCK_EX);
    $hits = json_decode(stream_get_contents($fh), true) ?: [];
    $hits = array_values(array_filter($hits, fn($t) => $t > $now - 3600));
    $blocked = count($hits) >= $perHour;
    if (!$blocked) $hits[] = $now;
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($hits));
    flock($fh, LOCK_UN); fclose($fh);
    if ($blocked) fail(429, 'Easy, champ! Too many requests – try again in a bit.');
}

function ok(array $data): void { echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(int $code, string $msg): void { http_response_code($code); echo json_encode(['error' => $msg]); exit; }
