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

// ---------- Config ----------
$config = file_exists(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$API_KEY      = getenv('GEMINI_API_KEY') ?: ($config['GEMINI_API_KEY'] ?? '');
$COACH_NAME   = $config['COACH_NAME']   ?? 'Mr. Vyb';
$MODEL_FAST   = $config['MODEL_FAST']   ?? 'gemini-2.5-flash';
$MODEL_STRONG = $config['MODEL_STRONG'] ?? 'gemini-2.5-pro';
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
    default:               fail(400, 'Unknown action');
}

// ================= Actions =================

function food_scan(array $in): void {
    global $MODEL_FAST, $MODEL_STRONG;
    $img = clean_b64($in['imageBase64'] ?? '');
    $cat = preg_replace('/[^a-z]/', '', strtolower((string)($in['mealCategory'] ?? 'unknown')));
    $prompt = <<<TXT
You are a nutrition estimation engine. Analyse the food photo and return STRICT JSON only:
{"items":[{"name":string,"estimatedQuantity":string,"cookingMethodGuess":string,
"confidence":"high|medium|low","estimatedCalories":number,"proteinG":number,
"carbsG":number,"fatG":number}],"overallConfidence":"high|medium|low",
"uncertaintyNote":string}
Rules: a photo cannot reliably reveal exact food weight, hidden oil or precise ingredients.
Use conservative confidence and always explain limitations in uncertaintyNote.
Indian dishes are common – name them specifically (e.g. "Paneer butter masala", "Masala dosa").
If there is no food in the photo, return {"items":[],"overallConfidence":"low","uncertaintyNote":"No food detected"}.
TXT;
    $parts = [img_part($img), ['text' => "Meal category: $cat. Estimate this meal."]];
    $result = gemini_json($MODEL_FAST, $prompt, [['role' => 'user', 'parts' => $parts]]);
    if (($result['overallConfidence'] ?? '') === 'low' && !empty($result['items'])) {
        $retry = gemini_json($MODEL_STRONG, $prompt, [['role' => 'user', 'parts' => $parts]], false);
        if ($retry) { $result = $retry; $result['retriedWithPro'] = true; }
    }
    $result['items'] = array_values(array_map('normalize_item', $result['items'] ?? []));
    $result['overallConfidence'] = $result['overallConfidence'] ?? 'low';
    $result['uncertaintyNote'] = (string)($result['uncertaintyNote'] ?? 'Estimates only – please check.');
    ok($result);
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
    $msgs = $in['messages'] ?? [];
    if (!is_array($msgs) || count($msgs) === 0 || count($msgs) > 50) { fail(400, 'Invalid messages'); }
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
Authorised user data (use it, never ask the user to repeat it):
$ctx
TXT;
    $text = gemini_call($MODEL_FAST, $system, $contents, ['temperature' => 0.7]);
    ok(['reply' => trim($text)]);
}

// ================= Helpers =================

function gemini_call(string $model, string $system, array $contents, array $genConfig, bool $failHard = true): ?string {
    global $API_KEY;
    $payload = [
        'systemInstruction' => ['parts' => [['text' => $system]]],
        'contents' => $contents,
        'generationConfig' => $genConfig,
    ];
    $ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $API_KEY],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => 80,
    ]);
    $resp = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!$resp || $status >= 400) {
        error_log("VYBE gemini error $status: " . substr((string)$resp, 0, 500));
        if ($failHard) fail(502, $status == 429 ? 'Mr. Vyb is busy right now. Try again in a minute.' : 'AI service error');
        return null;
    }
    $data = json_decode($resp, true);
    $text = '';
    foreach ($data['candidates'][0]['content']['parts'] ?? [] as $p) { $text .= $p['text'] ?? ''; }
    if ($text === '') {
        if ($failHard) fail(502, 'AI returned no answer');
        return null;
    }
    return $text;
}

function gemini_json(string $model, string $system, array $contents, bool $failHard = true): ?array {
    $text = gemini_call($model, $system, $contents,
        ['temperature' => 0.2, 'responseMimeType' => 'application/json'], $failHard);
    if ($text === null) return null;
    $text = trim(str_replace(['```json', '```'], '', $text));
    $json = json_decode($text, true);
    if (!is_array($json)) {
        if ($failHard) fail(502, 'Could not read AI response');
        return null;
    }
    return $json;
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
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
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
