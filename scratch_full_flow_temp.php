<?php
// Test if get_posts.php returns deleted temp comment
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$post_id = 1;
$user_id = 1;

// Call add_comment to generate temp_id and push to redis
$postData = [
    'action' => 'comment',
    'id' => 1,
    'user_id' => 1,
    'comment' => 'TEST TEMP COMMENT'
];

$url = 'http://127.0.0.1:8000/like_comment_action.php';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$res1 = curl_exec($ch);
curl_close($ch);
echo "add_comment response: $res1\n";

$resObj = json_decode($res1, true);
$temp_id = $resObj['comment_id'];

// Fetch to see it's there
$url = 'http://127.0.0.1:8000/get_posts.php?action=fetch_comments&id=1';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res2 = curl_exec($ch);
curl_close($ch);
$comments = json_decode($res2, true);
$found = false;
foreach ($comments as $c) {
    if ($c['comment_id'] === $temp_id) $found = true;
}
echo "get_posts initial found temp_id: " . ($found ? "YES" : "NO") . "\n";

// Delete it using the temp_id
$postData = [
    'action' => 'delete_comment',
    'post_id' => 1,
    'comment_id' => $temp_id,
    'comment' => 'TEST TEMP COMMENT',
    'user_id' => 1
];

$url = 'http://127.0.0.1:8000/like_comment_action.php';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$res3 = curl_exec($ch);
curl_close($ch);
echo "delete response: $res3\n";

// Fetch again to see if it's gone
$url = 'http://127.0.0.1:8000/get_posts.php?action=fetch_comments&id=1';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res4 = curl_exec($ch);
curl_close($ch);
$comments = json_decode($res4, true);
$found = false;
foreach ($comments as $c) {
    if ($c['comment_id'] === $temp_id || $c['comment'] === 'TEST TEMP COMMENT') $found = true;
}
echo "get_posts after delete found temp comment: " . ($found ? "YES" : "NO") . "\n";
