<?php
// Api/notification_worker.php
require_once __DIR__ . '/QueueManager.php';
require_once __DIR__ . '/connection.php'; 
require_once __DIR__ . '/push_helper.php';

echo "Starting background notification worker...\n";
$redis = RedisConfig::getConnection();

if (!$redis) die("Redis not available.\n");

while (true) {
    try {
        $json = $redis->brPop(QueueManager::QUEUE_NOTIFICATIONS, 5);
        if (!$json || !isset($json[1])) continue;
        
        $payload = json_decode($json[1], true);
        if (!$payload) continue;
        
        $type = $payload['type'];
        if ($type === 'like') {
            $pid = $payload['post_id'];
            $uid = $payload['user_id'];
            $ownQ = $con->query("SELECT p.user_id, m.name as liker_name FROM tbl_posts p, tbl_members m WHERE p.id = $pid AND m.id = $uid LIMIT 1");
            if ($ownQ && $row = $ownQ->fetch_assoc()) {
                $owner_id = $row['user_id'];
                $liker_name = $row['liker_name'];
                if ($owner_id != $uid && function_exists('sendExpoPushNotification')) {
                    sendExpoPushNotification($con, $owner_id, "New Like", "$liker_name liked your post.", ["type" => "like", "postId" => strval($pid)]);
                }
            }
        } elseif ($type === 'comment') {
            $pid = $payload['post_id'];
            $uid = $payload['user_id'];
            $ownQ = $con->query("SELECT p.user_id, m.name as commenter_name FROM tbl_posts p, tbl_members m WHERE p.id = $pid AND m.id = $uid LIMIT 1");
            if ($ownQ && $row = $ownQ->fetch_assoc()) {
                $owner_id = $row['user_id'];
                $commenter_name = $row['commenter_name'];
                if ($owner_id != $uid && function_exists('sendExpoPushNotification')) {
                    sendExpoPushNotification($con, $owner_id, "New Comment", "$commenter_name commented on your post.", ["type" => "comment", "postId" => strval($pid)]);
                }
            }
        } elseif ($type === 'follow') {
            $follower_id = $payload['follower_id'];
            $following_id = $payload['following_id'];
            $status = $payload['status'];
            
            $sQ = $con->query("SELECT name FROM tbl_members WHERE id = $follower_id LIMIT 1");
            $sender_name = ($sQ && $sRow = $sQ->fetch_assoc()) ? $sRow['name'] : "Someone";
            
            if (function_exists('sendExpoPushNotification')) {
                if ($status === 'accepted') {
                    sendExpoPushNotification($con, $following_id, "New Connection", "$sender_name accepted your request and followed you back!", ["type" => "follow", "user_id" => $follower_id]);
                } else {
                    sendExpoPushNotification($con, $following_id, "Follow Request", "$sender_name wants to connect with you.", ["type" => "follow_request", "user_id" => $follower_id]);
                }
            }
        }
    } catch (Exception $e) {
        echo "Notification worker error: " . $e->getMessage() . "\n";
    }
}
?>
