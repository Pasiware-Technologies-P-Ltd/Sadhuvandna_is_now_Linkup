<?php
// Test if get_posts.php returns deleted comment
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$post_id = 1;
$user_id = 1;

// Make sure we have a comment
$stmt = $con->prepare("INSERT INTO tbl_comments (post_id, user_id, comment, date) VALUES (?, ?, 'TEST API', NOW())");
$stmt->bind_param("ii", $post_id, $user_id);
$stmt->execute();
$new_id = $con->insert_id;
echo "Created comment $new_id\n";

// Clear redis so get_posts caches it
$redis = RedisConfig::getConnection();
$redis->del("post:1:comments");
$redis->del("post:1:comments_loaded");

// Call get_posts.php to cache it
$url = 'http://127.0.0.1:8000/get_posts.php?action=fetch_comments&id=1';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res1 = curl_exec($ch);
curl_close($ch);
echo "get_posts initial length: " . count(json_decode($res1, true)) . "\n";

// Delete it
$postData = [
    'action' => 'delete_comment',
    'post_id' => 1,
    'comment_id' => (string)$new_id,
    'comment' => 'TEST API',
    'user_id' => 1
];

$url = 'http://127.0.0.1:8000/like_comment_action.php';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$res2 = curl_exec($ch);
curl_close($ch);
echo "delete response: $res2\n";

// Fetch again
$url = 'http://127.0.0.1:8000/get_posts.php?action=fetch_comments&id=1';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res3 = curl_exec($ch);
curl_close($ch);
echo "get_posts after delete length: " . count(json_decode($res3, true)) . "\n";
