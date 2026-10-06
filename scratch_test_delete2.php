<?php
// Simulate exactly what like_comment_action.php does for delete_comment
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$post_id = 1;
$user_id = 1;
$redis = RedisConfig::getConnection();

echo "=== Current Redis State ===\n";
$redisKey = "post:{$post_id}:comments";
$cacheLoadedKey = "post:{$post_id}:comments_loaded";
$commentsRaw = $redis->lRange($redisKey, 0, -1);
echo "Redis list count: " . count($commentsRaw) . "\n";
foreach ($commentsRaw as $cr) {
    $c = json_decode($cr, true);
    echo "  Redis comment_id=" . ($c['comment_id'] ?? 'null') . " text='" . ($c['comment'] ?? '') . "'\n";
}

echo "\n=== Current MySQL State ===\n";
$res = $con->query("SELECT id, user_id, comment FROM tbl_comments WHERE post_id=$post_id ORDER BY id DESC");
while ($row = $res->fetch_assoc()) {
    echo "  MySQL id={$row['id']} text='" . $row['comment'] . "'\n";
    echo "         hex=" . bin2hex($row['comment']) . "\n";
}

// Now test: if we have a temp_ comment to delete, what does its text look like?
echo "\n=== Test text comparison ===\n";
if (!empty($commentsRaw)) {
    $c = json_decode($commentsRaw[0], true);
    $redis_comment_text = $c['comment'] ?? '';
    $decoded = htmlspecialchars_decode($redis_comment_text);
    echo "Redis stored text : '$redis_comment_text'\n";
    echo "After decode      : '$decoded'\n";
    echo "Redis hex         : " . bin2hex($redis_comment_text) . "\n";
    echo "Decoded hex       : " . bin2hex($decoded) . "\n";
    
    // Try the DELETE
    $stmt = $con->prepare("DELETE FROM tbl_comments WHERE post_id=? AND user_id=? AND comment=? LIMIT 1");
    $stmt->bind_param("iis", $post_id, $user_id, $decoded);
    $stmt->execute();
    echo "Delete by text: affected=" . $stmt->affected_rows . " error=" . $stmt->error . "\n";
}
