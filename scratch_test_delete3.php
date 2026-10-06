<?php
// Simulate the exact delete_comment API flow
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$post_id = 1;
$user_id = 1;
$redis = RedisConfig::getConnection();

echo "=== STEP 1: Add a test comment (simulate like_comment_action.php add_comment) ===\n";
// First, add a comment to Redis with temp_ ID (like the app does)
$temp_id = 'temp_' . uniqid();
$comment_entry = json_encode([
    'comment_id' => $temp_id,
    'user_id' => $user_id,
    'name' => 'Test User',
    'profile_photo' => '',
    'comment' => htmlspecialchars("Hello & World test"),
    'date' => date("d M Y, h:i A")
]);
$redisKey = "post:{$post_id}:comments";
$cacheLoadedKey = "post:{$post_id}:comments_loaded";
$redis->rPush($redisKey, $comment_entry);
$redis->setex($cacheLoadedKey, 3600, "1");

// Also add to MySQL (simulate what worker does)
$raw_comment = "Hello & World test";
$stmt = $con->prepare("INSERT INTO tbl_comments (post_id, user_id, comment, date) VALUES (?, ?, ?, NOW())");
$stmt->bind_param("iis", $post_id, $user_id, $raw_comment);
$stmt->execute();
$real_id = $con->insert_id;
echo "Added comment to MySQL: id=$real_id, temp_id=$temp_id\n";

echo "\n=== STEP 2: Fetch comments (what CommentsScreen sees) ===\n";
$commentsRaw = $redis->lRange($redisKey, 0, -1);
foreach ($commentsRaw as $cr) {
    $c = json_decode($cr, true);
    echo "  comment_id={$c['comment_id']} text='{$c['comment']}'\n";
}

echo "\n=== STEP 3: User deletes - sending temp_ ID and encoded text ===\n";
$delete_comment_id = $temp_id;
$delete_comment_text = htmlspecialchars("Hello & World test"); // This is what frontend sends (from Redis)
echo "Frontend sends: comment_id=$delete_comment_id, comment_text=$delete_comment_text\n";

// Simulate like_comment_action.php delete_comment
// Redis delete
$commentsRaw = $redis->lRange($redisKey, 0, -1);
$redis_deleted = false;
foreach ($commentsRaw as $cr) {
    $cObj = json_decode($cr, true);
    if ($cObj && (string)$cObj['comment_id'] === (string)$delete_comment_id) {
        $removed = $redis->lRem($redisKey, $cr, 1);
        echo "Redis lRem result: $removed\n";
        $redis_deleted = true;
        break;
    }
}
echo "Redis deleted: " . ($redis_deleted ? "YES" : "NO") . "\n";

// MySQL delete
$decoded = htmlspecialchars_decode($delete_comment_text);
echo "Decoded comment text: '$decoded'\n";
if (strpos($delete_comment_id, 'temp_') === 0) {
    $stmt2 = $con->prepare("DELETE FROM tbl_comments WHERE post_id=? AND user_id=? AND comment=? LIMIT 1");
    $stmt2->bind_param("iis", $post_id, $user_id, $decoded);
    $stmt2->execute();
    echo "MySQL DELETE by text: affected=" . $stmt2->affected_rows . " error=" . ($stmt2->error ?: "none") . "\n";
}

echo "\n=== STEP 4: Redis after delete ===\n";
$commentsRaw = $redis->lRange($redisKey, 0, -1);
echo "Redis count: " . count($commentsRaw) . "\n";

echo "\n=== STEP 5: MySQL after delete ===\n";
$res = $con->query("SELECT id, user_id, comment FROM tbl_comments WHERE post_id=$post_id ORDER BY id DESC LIMIT 5");
while ($row = $res->fetch_assoc()) {
    echo "  id={$row['id']} text='{$row['comment']}'\n";
}
