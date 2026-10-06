<?php
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$redis = RedisConfig::getConnection();
$pid = 1;
$redisKey = "post:{$pid}:comments";
$redis->del($redisKey);

// Push a comment into Redis exactly as get_posts.php does
$c = [
    'id' => 250,
    'user_id' => 1,
    'name' => 'John Doe',
    'profile_photo' => '',
    'comment' => 'Hello & World',
    'date' => '2026-10-06 10:00:00'
];

$cacheComment = json_encode([
    'comment_id' => $c['id'],
    'user_id' => $c['user_id'],
    'name' => htmlspecialchars($c['name']),
    'profile_photo' => htmlspecialchars($c['profile_photo']),
    'comment' => htmlspecialchars($c['comment']),
    'date' => date("d M Y, h:i A", strtotime($c['date']))
]);

$redis->rPush($redisKey, $cacheComment);

// Now simulate like_comment_action.php delete_comment
$comment_id = '250';
$user_id = 1;

$commentsRaw = $redis->lRange($redisKey, 0, -1);
$deleted = false;
foreach ($commentsRaw as $cr) {
    $cObj = json_decode($cr, true);
    if ($cObj && isset($cObj['comment_id']) && (string)$cObj['comment_id'] === (string)$comment_id) {
        $res = $redis->lRem($redisKey, $cr, 1);
        echo "lRem result: $res\n";
        $deleted = true;
        break;
    }
}
echo "Did we delete from Redis? " . ($deleted ? "YES" : "NO") . "\n";
echo "Redis list length after: " . $redis->lLen($redisKey) . "\n";
