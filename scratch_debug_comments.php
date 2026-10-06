<?php
// Quick debug test for comment delete
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$post_id = $_GET['post_id'] ?? 1;
$redis = RedisConfig::getConnection();

echo "=== REDIS COMMENTS ===\n";
$redisKey = "post:{$post_id}:comments";
$cacheLoadedKey = "post:{$post_id}:comments_loaded";
echo "cache_loaded key exists: " . ($redis->exists($cacheLoadedKey) ? "YES" : "NO") . "\n";
$commentsRaw = $redis->lRange($redisKey, 0, -1);
echo "Redis comment count: " . count($commentsRaw) . "\n";
foreach ($commentsRaw as $cr) {
    $c = json_decode($cr, true);
    echo "  comment_id=" . ($c['comment_id'] ?? 'null') . " user_id=" . ($c['user_id'] ?? 'null') . " comment=" . substr($c['comment'] ?? '', 0, 40) . "\n";
}

echo "\n=== MYSQL COMMENTS ===\n";
$res = $con->query("SELECT id, user_id, comment FROM tbl_comments WHERE post_id=$post_id ORDER BY id DESC LIMIT 10");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        echo "  id=" . $row['id'] . " user_id=" . $row['user_id'] . " comment=" . substr($row['comment'], 0, 40) . "\n";
    }
}
