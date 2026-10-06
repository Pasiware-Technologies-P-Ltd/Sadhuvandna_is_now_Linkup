<?php
// Let's debug what's exactly failing in delete_comment
require 'Api/connection.php';

$postData = [
    'action' => 'delete_comment',
    'post_id' => 1,
    'comment_id' => '224', // Use a real ID or we will add one
    'comment' => 'test_string',
    'user_id' => 1
];

$url = 'http://127.0.0.1:8000/like_comment_action.php';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpcode\n";
echo "Response: $response\n";
