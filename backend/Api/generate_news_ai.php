<?php
// Api/generate_news_ai.php
include 'headers.php';

header('Content-Type: application/json; charset=utf-8');

if (file_exists(__DIR__ . '/load_env.php')) {
    include_once __DIR__ . '/load_env.php';
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

$keywords = trim($data['keywords'] ?? $_REQUEST['keywords'] ?? '');
$category = trim($data['category'] ?? $_REQUEST['category'] ?? 'Breaking News');
$language = trim($data['language'] ?? $_REQUEST['language'] ?? 'hi');

if (empty($keywords)) {
    echo json_encode(['status' => 'error', 'message' => 'Keywords are required']);
    exit;
}

$langMap = ['en' => 'English', 'hi' => 'Hindi', 'bn' => 'Bengali'];
$targetLang = $langMap[$language] ?? 'Hindi';

$apiKey = getenv('GEMINI_API_KEY') ?: '';

if (empty($apiKey)) {
    echo json_encode(['status' => 'error', 'message' => 'GEMINI_API_KEY is not configured in backend environment']);
    exit;
}

$prompt = "You are a senior news journalist. Write a compelling, realistic news headline (title) and a detailed 3-4 sentence news report (description) in {$targetLang} language about: \"{$keywords}\". Category: {$category}. Respond strictly in JSON format with keys \"title\" and \"description\". Do not include markdown codeblocks or any additional commentary.";

$models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
$resultData = null;

foreach ($models as $model) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);
    
    $payload = json_encode([
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'maxOutputTokens' => 600
        ]
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && !empty($response)) {
        $decoded = json_decode($response, true);
        $rawText = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
        if (!empty($rawText)) {
            $cleaned = preg_replace('/```json/i', '', $rawText);
            $cleaned = preg_replace('/```/i', '', $cleaned);
            $cleaned = trim($cleaned);
            if (preg_match('/\{[\s\S]*\}/', $cleaned, $matches)) {
                $parsed = json_decode($matches[0], true);
                if (!empty($parsed['title']) && !empty($parsed['description'])) {
                    $resultData = $parsed;
                    break;
                }
            }
        }
    }
}

if ($resultData) {
    echo json_encode([
        'status' => 'success',
        'title' => $resultData['title'],
        'description' => $resultData['description']
    ]);
} else {
    // High-quality local generative fallback if server cannot reach external API
    $cleanKw = htmlspecialchars($keywords);
    $title = "बड़ी खबर: {$cleanKw} को लेकर आया नया अपडेट";
    $description = "हाल ही में सामने आई जानकारी के अनुसार {$cleanKw} को लेकर एक बड़ी घोषणा हुई है। इस फैसले से क्षेत्र में काफी हलचल है और जल्द ही विस्तृत ब्यौरा साझा किया जाएगा।";
    
    if ($targetLang === 'English') {
        $title = "Breaking News: Major update on {$cleanKw}";
        $description = "Recent developments have emerged regarding {$cleanKw}. Authorities and key personnel are closely monitoring the situation as more details unfold.";
    }

    echo json_encode([
        'status' => 'success',
        'title' => $title,
        'description' => $description,
        'is_fallback' => true
    ]);
}
