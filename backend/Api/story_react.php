<?php
include("headers.php");
require_once("connection.php");
include("push_helper.php");
date_default_timezone_set('Asia/Kolkata');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

$user_id = intval($data['user_id'] ?? $_POST['user_id'] ?? 0);
$story_id = intval($data['story_id'] ?? $_POST['story_id'] ?? 0);
$reaction_type = trim($data['reaction_type'] ?? $_POST['reaction_type'] ?? 'love');

if (!$user_id || !$story_id) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid parameters']);
    exit;
}

// Map short emoji / code names
$valid_reactions = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'fire', 'clap'];
if (!in_array($reaction_type, $valid_reactions)) {
    $reaction_type = 'love';
}

// 1. Check existing reaction
$check = $con->prepare("SELECT id, reaction_type FROM tbl_story_reactions WHERE story_id = ? AND user_id = ? LIMIT 1");
$check->bind_param("ii", $story_id, $user_id);
$check->execute();
$checkRes = $check->get_result();

$action = 'reacted';
$current_user_reaction = $reaction_type;

if ($checkRes && $checkRes->num_rows > 0) {
    $existing = $checkRes->fetch_assoc();
    if ($existing['reaction_type'] === $reaction_type) {
        // Same reaction clicked -> TOGGLE OFF / REMOVE
        $del = $con->prepare("DELETE FROM tbl_story_reactions WHERE id = ?");
        $del->bind_param("i", $existing['id']);
        $del->execute();
        $action = 'removed';
        $current_user_reaction = null;
    } else {
        // Change reaction
        $upd = $con->prepare("UPDATE tbl_story_reactions SET reaction_type = ?, created_at = NOW() WHERE id = ?");
        $upd->bind_param("si", $reaction_type, $existing['id']);
        $upd->execute();
        $action = 'updated';
        $current_user_reaction = $reaction_type;
    }
} else {
    // New reaction
    $ins = $con->prepare("INSERT INTO tbl_story_reactions (story_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, NOW())");
    $ins->bind_param("iis", $story_id, $user_id, $reaction_type);
    $ins->execute();
    $action = 'reacted';
    $current_user_reaction = $reaction_type;
}

// 2. If reacted or updated, send Push Notification to Story Owner
if ($action !== 'removed') {
    // Get story owner and media
    $stQ = $con->prepare("SELECT user_id, media FROM tbl_stories WHERE id = ? LIMIT 1");
    $stQ->bind_param("i", $story_id);
    $stQ->execute();
    $stRes = $stQ->get_result();

    if ($stRes && $stRes->num_rows > 0) {
        $stRow = $stRes->fetch_assoc();
        $owner_id = intval($stRow['user_id']);

        if ($owner_id > 0 && $owner_id !== $user_id) {
            // Get reactor name
            $uQ = $con->query("SELECT name FROM tbl_members WHERE id = '$user_id' LIMIT 1");
            $reactor_name = ($uQ && $uQ->num_rows > 0) ? $uQ->fetch_assoc()['name'] : 'Someone';

            $emojiMap = [
                'like' => '👍',
                'love' => '❤️',
                'care' => '🥰',
                'haha' => '😂',
                'wow'  => '😮',
                'sad'  => '😢',
                'fire' => '🔥',
                'clap' => '👏'
            ];
            $emoji = $emojiMap[$reaction_type] ?? '❤️';

            $title = "Story Reaction";
            $body = "$reactor_name reacted $emoji to your story";
            sendExpoPushNotification($con, $owner_id, $title, $body, [
                'type' => 'story_reaction',
                'story_id' => $story_id,
                'reaction' => $reaction_type,
                'user_id' => $user_id
            ]);
        }
    }
}

// 3. Count total reactions and summary
$countQ = $con->prepare("SELECT COUNT(*) as total FROM tbl_story_reactions WHERE story_id = ?");
$countQ->bind_param("i", $story_id);
$countQ->execute();
$total_reactions = $countQ->get_result()->fetch_assoc()['total'] ?? 0;

$sumQ = $con->prepare("SELECT reaction_type, COUNT(*) as count FROM tbl_story_reactions WHERE story_id = ? GROUP BY reaction_type");
$sumQ->bind_param("i", $story_id);
$sumQ->execute();
$sumRes = $sumQ->get_result();
$summary = [];
if ($sumRes) {
    while ($r = $sumRes->fetch_assoc()) {
        $summary[$r['reaction_type']] = intval($r['count']);
    }
}

echo json_encode([
    'status' => 'success',
    'action' => $action,
    'user_reaction' => $current_user_reaction,
    'total_reactions' => intval($total_reactions),
    'reactions_summary' => $summary
]);
?>