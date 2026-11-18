<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include("connection.php");
date_default_timezone_set("Asia/Kolkata");
$con->query("SET time_zone = '+05:30'");

// profile_id of the OTHER user (receiver)
$receiver_id = intval($_GET['profile_id'] ?? 0);
$my_id = intval($_GET['my_profile_id'] ?? 0);
$platform = $_GET['platform'] ?? 'marriage';

// 1. Get Receiver Status
// Source of truth is ALWAYS tbl_members.last_active
if($platform === 'community'){
    // Community: receiver_id is member_id
    $sql = "SELECT last_active, (last_active >= NOW() - INTERVAL 2 MINUTE) as is_online 
            FROM tbl_members WHERE id='$receiver_id' LIMIT 1";
} else {
    // Marriage: receiver_id is marriage_profile_id, join with members to get their status
    $sql = "SELECT m.last_active, (m.last_active >= NOW() - INTERVAL 2 MINUTE) as is_online 
            FROM tbl_members m
            JOIN tbl_marriage_profiles mp ON mp.user_id = m.id
            WHERE mp.id = '$receiver_id' LIMIT 1";
}

$res = $con->query($sql);
$row = $res ? $res->fetch_assoc() : null;

$online = false;
$last_active = null;

if($row){
    $online = ($row['is_online'] == 1);
    if($row['last_active']){
        $last_active = date("h:i A, d M", strtotime($row['last_active']));
    }
}

// 2. Check Typing Status
$is_typing = false;
if($my_id){
    try {
        $t_sql = "SELECT is_typing, updated_at FROM tbl_chat_typing 
                  WHERE profile_id='$receiver_id' AND target_id='$my_id' 
                  AND is_typing=1 
                  AND chat_platform='$platform'
                  AND (UNIX_TIMESTAMP(NOW()) - UNIX_TIMESTAMP(updated_at) < 5) 
                  LIMIT 1";
        $t_res = $con->query($t_sql);
        if($t_res && $t_res->num_rows > 0){
            $is_typing = true;
        }
    } catch (Exception $e) {
        // Table might not exist, just ignore for now
    }
}

// 3. Check Connection & 2-Message Limit for Community
$is_connected = false;
$sent_count = 0;
$limit_reached = false;

if ($platform === 'community' && $my_id > 0 && $receiver_id > 0) {
    // Check mutual connection in tbl_followers
    $chk1 = $con->prepare("SELECT id FROM tbl_followers WHERE follower_id = ? AND following_id = ? AND status = 'accepted' LIMIT 1");
    if ($chk1) {
        $chk1->bind_param("ii", $my_id, $receiver_id);
        $chk1->execute();
        $r1 = $chk1->get_result();

        $chk1->bind_param("ii", $receiver_id, $my_id);
        $chk1->execute();
        $r2 = $chk1->get_result();

        if ($r1 && $r1->num_rows > 0 && $r2 && $r2->num_rows > 0) {
            $is_connected = true;
        }
    }

    if (!$is_connected) {
        $cq = $con->prepare("SELECT COUNT(*) FROM tbl_messages WHERE sender_id = ? AND receiver_id = ? AND chat_platform = 'community' AND is_deleted = 0");
        if ($cq) {
            $cq->bind_param("ii", $my_id, $receiver_id);
            $cq->execute();
            $sent_count = intval($cq->get_result()->fetch_row()[0] ?? 0);
        }
        $limit_reached = ($sent_count >= 2);
    }
}

echo json_encode([
    'status' => 'success',
    'online' => $online,
    'last_active' => $last_active,
    'is_typing' => $is_typing,
    'is_connected' => $is_connected,
    'sent_count' => $sent_count,
    'message_limit' => 2,
    'limit_reached' => $limit_reached
]);
?>