<?php
// Simulate the delete_comment API flow with batch delete logic
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$post_id = 1;
$user_id = 1;
$redis = RedisConfig::getConnection();

echo "=== STEP 1: Add a test comment ===\n";
// Create a new comment to test delete
$temp_id = 'temp_' . uniqid();
$comment_text = htmlspecialchars("Hello World Test");

// Add to MySQL
$decoded = htmlspecialchars_decode($comment_text);
$stmt = $con->prepare("INSERT INTO tbl_comments (post_id, user_id, comment, date) VALUES (?, ?, ?, NOW())");
$stmt->bind_param("iis", $post_id, $user_id, $decoded);
$stmt->execute();
$real_id = $con->insert_id;
echo "Added comment to MySQL: id=$real_id, temp_id=$temp_id\n";

// Add to Redis cache to simulate loaded cache
$comment_entry = json_encode([
    'comment_id' => $temp_id,
    'user_id' => $user_id,
    'name' => 'Test User',
    'profile_photo' => '',
    'comment' => $comment_text,
    'date' => date("d M Y, h:i A")
]);
$redisKey = "post:{$post_id}:comments";
$cacheLoadedKey = "post:{$post_id}:comments_loaded";
$redis->rPush($redisKey, $comment_entry);
$redis->setex($cacheLoadedKey, 3600, "1");


echo "\n=== STEP 2: Simulate User Deleting the Comment ===\n";
$delete_comment_id = $temp_id;
$delete_comment_text = $comment_text; 
echo "Frontend sends: comment_id=$delete_comment_id, comment_text=$delete_comment_text\n";

$pendingDeleteKey = "pending_deletes:comments";

// Step 1: Remove from Redis
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
echo "Redis list deleted: " . ($redis_deleted ? "YES" : "NO") . "\n";

// Step 2: Add to pending_deletes
$pendingEntry = json_encode([
    'comment_id'   => $delete_comment_id,
    'post_id'      => $post_id,
    'user_id'      => $user_id,
    'comment_text' => htmlspecialchars_decode($delete_comment_text)
]);
$redis->lPush($pendingDeleteKey, $pendingEntry);
echo "Added to pending_deletes list. Current pending queue length: " . $redis->lLen($pendingDeleteKey) . "\n";

echo "\n=== STEP 3: Simulate get_posts.php (Fetching comments) ===\n";
$comments = [];
$commentsRaw = $redis->lRange($redisKey, 0, -1);
if ($commentsRaw) {
    foreach ($commentsRaw as $cr) {
        $cObj = json_decode($cr, true);
        if ($cObj) $comments[] = $cObj;
    }
}
echo "Comments from Redis list before filtering: " . count($comments) . "\n";

// Filter out pending
$pendingRaw = $redis->lRange($pendingDeleteKey, 0, -1);
if (!empty($pendingRaw)) {
    $pendingIds = [];
    foreach ($pendingRaw as $pr) {
        $pObj = json_decode($pr, true);
        if ($pObj && isset($pObj['comment_id'])) {
            $pendingIds[(string)$pObj['comment_id']] = true;
        }
    }
    if (!empty($pendingIds)) {
        $comments = array_values(array_filter($comments, function($c) use ($pendingIds) {
            return !isset($pendingIds[(string)$c['comment_id']]);
        }));
    }
}
echo "Comments from Redis list after filtering: " . count($comments) . "\n";

echo "\n=== STEP 4: Force worker to run batch_delete_comments ===\n";
require_once 'Api/QueueManager.php';
// We simulate worker logic directly
$pendingRaw = $redis->lRange($pendingDeleteKey, 0, -1);
$realIdsToDelete = [];
foreach ($pendingRaw as $pr) {
    $pObj = json_decode($pr, true);
    if (!$pObj) continue;
    
    $c_id = $pObj['comment_id'];
    $pid = $pObj['post_id'];
    $uid = $pObj['user_id'];
    $text = $pObj['comment_text'];
    
    if (strpos($c_id, 'temp_') === 0) {
        $stmt = $con->prepare("DELETE FROM tbl_comments WHERE post_id=? AND user_id=? AND comment=? LIMIT 1");
        $stmt->bind_param("iis", $pid, $uid, $text);
        $stmt->execute();
        echo "Worker deleted temp comment by text. Affected: " . $stmt->affected_rows . "\n";
    } else {
        $realIdsToDelete[] = (int)$c_id;
    }
}
if (!empty($realIdsToDelete)) {
    $ids_str = implode(',', $realIdsToDelete);
    $con->query("DELETE FROM tbl_comments WHERE id IN ($ids_str)");
    echo "Worker deleted real IDs: $ids_str. Affected: " . $con->affected_rows . "\n";
}
$redis->del($pendingDeleteKey);
echo "Worker cleared pending deletes.\n";

// Verify MySQL
$res = $con->query("SELECT id FROM tbl_comments WHERE id=$real_id");
echo "Is comment still in MySQL? " . ($res->num_rows > 0 ? "YES" : "NO") . "\n";
