<?php
include("headers.php");
require_once("connection.php");
include("push_helper.php");
date_default_timezone_set('Asia/Kolkata');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

$user_id = intval($data['user_id'] ?? $_POST['user_id'] ?? 0);
$story_id = intval($data['story_id'] ?? $_POST['story_id'] ?? 0);
$story_owner_id = intval($data['story_owner_id'] ?? $_POST['story_owner_id'] ?? 0);
$message = trim($data['message'] ?? $_POST['message'] ?? '');

if (!$user_id || !$story_id || empty($message)) {
    echo json_encode(['status' => 'error', 'message' => 'User, Story ID, and message are required']);
    exit;
}

// Fetch story owner if not supplied
if (!$story_owner_id) {
    $stQ = $con->query("SELECT user_id FROM tbl_stories WHERE id = '$story_id' LIMIT 1");
    if ($stQ && $stQ->num_rows > 0) {
        $story_owner_id = intval($stQ->fetch_assoc()['user_id']);
    }
}

if (!$story_owner_id || $story_owner_id === $user_id) {
    echo json_encode(['status' => 'error', 'message' => 'Cannot reply to your own story']);
    exit;
}

// Get sender's name
$uQ = $con->query("SELECT name FROM tbl_members WHERE id = '$user_id' LIMIT 1");
$sender_name = ($uQ && $uQ->num_rows > 0) ? $uQ->fetch_assoc()['name'] : 'Someone';

// Format message: "Replied to your story: <message>"
$full_message = "Replied to your story: " . $message;
$client_id = uniqid('story_reply_');
$platform = 'community';
$is_comm = 1;

$stmt = $con->prepare("
    INSERT INTO tbl_messages 
    (sender_id, receiver_id, message, created_at, seen, is_community, chat_platform, client_message_id)
    VALUES (?, ?, ?, NOW(), 0, ?, ?, ?)
");
$stmt->bind_param("iisiss", $user_id, $story_owner_id, $full_message, $is_comm, $platform, $client_id);

if ($stmt->execute()) {
    // Send Push Notification to story owner
    sendExpoPushNotification(
        $con,
        $story_owner_id,
        "Story Reply from $sender_name",
        $message,
        [
            'type' => 'chat',
            'chat_platform' => 'community',
            'sender_id' => $user_id,
            'story_id' => $story_id
        ]
    );

    echo json_encode(['status' => 'success', 'message' => 'Reply sent successfully!']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to send reply: ' . $stmt->error]);
}
?>