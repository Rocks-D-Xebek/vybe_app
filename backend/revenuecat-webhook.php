<?php
/**
 * RevenueCat → VYBE: marks users Premium (or not) in Supabase when they buy, renew, cancel or expire.
 * RevenueCat dashboard → Integrations → Webhooks:
 *   URL: https://vibenews.in/backend/revenuecat-webhook
 *   Authorization header: the same value as REVENUECAT_WEBHOOK_SECRET in config.php
 * Needs in config.php: SUPABASE_URL, SUPABASE_SERVICE_KEY (secret! never in the app), REVENUECAT_WEBHOOK_SECRET.
 */
header('Content-Type: application/json');
$config = file_exists(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$secret = $config['REVENUECAT_WEBHOOK_SECRET'] ?? '';
$sbUrl  = rtrim($config['SUPABASE_URL'] ?? '', '/');
$sbKey  = $config['SUPABASE_SERVICE_KEY'] ?? '';

function out(int $code, array $body) { http_response_code($code); echo json_encode($body); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'POST only']);
if (!$secret || !$sbUrl || !$sbKey) out(500, ['error' => 'Webhook not configured']);
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!hash_equals($secret, preg_replace('/^Bearer\s+/i', '', $auth))) out(401, ['error' => 'Unauthorized']);

$event = json_decode(file_get_contents('php://input'), true)['event'] ?? null;
if (!$event) out(400, ['error' => 'No event']);

$uid = (string)($event['app_user_id'] ?? '');
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $uid)) out(200, ['ok' => true, 'skipped' => 'anonymous user']);

$type = (string)($event['type'] ?? '');
$exp  = isset($event['expiration_at_ms']) ? gmdate('c', intdiv((int)$event['expiration_at_ms'], 1000)) : null;
$grant = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT'];
$revoke = ['EXPIRATION', 'REFUND_REVERSED_PURCHASE'];

if (in_array($type, $grant, true)) $patch = ['is_premium' => true, 'premium_until' => $exp];
elseif (in_array($type, $revoke, true) || ($type === 'CANCELLATION' && ($event['cancel_reason'] ?? '') === 'CUSTOMER_SUPPORT')) $patch = ['is_premium' => false, 'premium_until' => null];
else out(200, ['ok' => true, 'ignored' => $type]);   // e.g. CANCELLATION: stays Premium until it expires

$ch = curl_init("$sbUrl/rest/v1/profiles?id=eq.$uid");
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => 'PATCH',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['apikey: ' . $sbKey, 'Authorization: Bearer ' . $sbKey, 'Content-Type: application/json', 'Prefer: return=minimal'],
    CURLOPT_POSTFIELDS => json_encode($patch),
    CURLOPT_TIMEOUT => 20,
]);
curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($status >= 300) { error_log("VYBE webhook supabase $status"); out(500, ['error' => 'Database update failed']); } // RevenueCat retries
out(200, ['ok' => true, 'type' => $type]);
