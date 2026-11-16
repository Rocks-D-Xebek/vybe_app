<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Load request body
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['image'])) {
    echo json_encode(["error" => "No image provided"]);
    exit;
}

$imageBase64 = $input['image'];
$apiKey = "AIzaSyCG4NGtQTpA5GQcwOzVgGTfksEHI5tMQro"; // Replace with your actual Gemini API key

// Prepare the payload for Gemini Multimodal API (gemini-2.5-flash or similar)
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;

$data = [
    "contents" => [
        [
            "parts" => [
                [
                    "text" => "Analyze this food image for a fitness app named VYBE. Identify the food items, estimate total calories, breakdown macros (protein, carbs, fat in grams), and write a short, friendly, Gen-Z style response from Mr. Vyb (your fitness coach) asking a casual follow-up about cooking methods or hidden oils. Return valid JSON with keys: food_identified, estimated_calories, macros (protein, carbs, fat), mr_vyb_message."
                ],
                [
                    "inline_data" => [
                        "mime_type" => "image/jpeg",
                        "data" => $imageBase64
                    ]
                ]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);
curl_close($ch);

if (!$response) {
    echo json_encode(["error" => "Failed to connect to Gemini API"]);
    exit;
}

// Parse Gemini response and output clean JSON back to the VYBE app
$result = json_decode($response, true);
$rawText = $result['candidates'][0]['content']['parts'][0]['text'] ?? "{}";

// Clean up markdown code blocks if Gemini wraps the JSON response
$cleanJson = trim(str_replace(["```json", "```"], "", $rawText));

echo $cleanJson;
?>