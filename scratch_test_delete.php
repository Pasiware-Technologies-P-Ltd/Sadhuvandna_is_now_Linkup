<?php
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$post_id = 1;

echo "=== BEFORE DELETE ===\n";
$res = $con->query("SELECT id, user_id, comment FROM tbl_comments WHERE post_id=$post_id ORDER BY id DESC LIMIT 10");
while ($row = $res->fetch_assoc()) {
    echo "  id={$row['id']} user_id={$row['user_id']} comment=" . substr($row['comment'], 0, 50) . "\n";
}

// Try deleting id=213 (user_id=1)
$comment_id = 213;
$user_id = 1;
$stmt = $con->prepare("DELETE FROM tbl_comments WHERE id=? AND user_id=?");
$stmt->bind_param("ii", $comment_id, $user_id);
$result = $stmt->execute();
echo "\nDELETE by ID (id=213): " . ($result ? "OK, rows=" . $stmt->affected_rows : "FAIL: " . $stmt->error) . "\n";

// Also try text-match delete
$pid = $post_id;
$uid = 1;
$comment_text = "test comment 2";
$stmt2 = $con->prepare("DELETE FROM tbl_comments WHERE post_id=? AND user_id=? AND comment=? LIMIT 1");
$stmt2->bind_param("iis", $pid, $uid, $comment_text);
$result2 = $stmt2->execute();
echo "DELETE by text ('test comment 2'): " . ($result2 ? "OK, rows=" . $stmt2->affected_rows : "FAIL: " . $stmt2->error) . "\n";

echo "\n=== AFTER DELETE ===\n";
$res2 = $con->query("SELECT id, user_id, comment FROM tbl_comments WHERE post_id=$post_id ORDER BY id DESC LIMIT 10");
while ($row = $res2->fetch_assoc()) {
    echo "  id={$row['id']} user_id={$row['user_id']} comment=" . substr($row['comment'], 0, 50) . "\n";
}

// Also clear the Redis cache_loaded so next fetch comes fresh from MySQL
$redis = RedisConfig::getConnection();
if ($redis) {
    $redis->del("post:{$post_id}:comments_loaded");
    $redis->del("post:{$post_id}:comments");
    echo "\nRedis cache cleared for post $post_id\n";
}
