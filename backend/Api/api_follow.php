<?php
include("connection.php");
include("push_helper.php");
header('Content-Type: application/json');

// Get action from request or JSON input
$input = json_decode(file_get_contents("php://input"), true) ?: [];
$action = $_REQUEST['action'] ?? $input['action'] ?? '';
$current_user_id = intval($_REQUEST['current_user_id'] ?? $_POST['current_user_id'] ?? $input['current_user_id'] ?? $_GET['current_user_id'] ?? 0);

if(!$current_user_id && $action !== 'get_counts' && $action !== 'fetch_suggestions'){
    echo json_encode(["ok" => false, "message" => "Not logged in (Missing current_user_id)"]);
    exit;
}

// WebSocket helper
function triggerWebSocket($receiverId, $type, $payload, $isGlobal = false) {
    $socketBase = getenv('SOCKET_URL') ?: 'http://localhost:3000';
    $url = rtrim($socketBase, '/') . '/api/trigger';
    $postData = array(
        'receiverId' => $receiverId,
        'type' => $type,
        'payload' => $payload,
        'global' => $isGlobal
    );
    $options = array(
        'http' => array(
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($postData)
        )
    );
    $context  = stream_context_create($options);
    @file_get_contents($url, false, $context);
}

$follower_id = $current_user_id;

if($action === 'follow'){
    $following_id = intval($_REQUEST['user_id'] ?? $_POST['user_id'] ?? $input['user_id'] ?? $_GET['user_id'] ?? 0);
    
    if(!$following_id) {
        echo json_encode(["ok" => false, "message" => "Target user missing"]);
        exit;
    }
    
    if($follower_id == $following_id){
        echo json_encode(["ok" => false, "message" => "You cannot follow yourself"]);
        exit;
    }

    require_once 'RedisConfig.php';
    require_once 'QueueManager.php';
    require_once 'RedisFollowHelper.php';
    
    $redis = RedisConfig::getConnection();
    
    // Direct authoritative write to MySQL tbl_followers
    $check = $con->query("SELECT id, status FROM tbl_followers WHERE follower_id=$follower_id AND following_id=$following_id LIMIT 1");
    if(!$check || $check->num_rows == 0){
        $sender_name = "Someone";
        $sQ = $con->query("SELECT name FROM tbl_members WHERE id = $follower_id LIMIT 1");
        if($sRow = $sQ->fetch_assoc()) $sender_name = $sRow['name'];

        $check_other = $con->query("SELECT id, status FROM tbl_followers WHERE follower_id=$following_id AND following_id=$follower_id LIMIT 1");
        if($check_other && $check_other->num_rows > 0){
            $stmt = $con->prepare("INSERT INTO tbl_followers (follower_id, following_id, status) VALUES (?, ?, 'accepted') ON DUPLICATE KEY UPDATE status='accepted'");
            $stmt->bind_param("ii", $follower_id, $following_id);
            $stmt->execute();
            $con->query("UPDATE tbl_followers SET status='accepted' WHERE follower_id=$following_id AND following_id=$follower_id");
            $status = "connected";
            sendExpoPushNotification($con, $following_id, "New Connection", "$sender_name accepted your request and connected with you!", ["type" => "follow", "user_id" => $follower_id]);
        } else {
            $stmt = $con->prepare("INSERT INTO tbl_followers (follower_id, following_id, status) VALUES (?, ?, 'pending') ON DUPLICATE KEY UPDATE status='pending'");
            $stmt->bind_param("ii", $follower_id, $following_id);
            $stmt->execute();
            $status = "requested";
            sendExpoPushNotification($con, $following_id, "Connection Request", "$sender_name wants to connect with you.", ["type" => "follow_request", "user_id" => $follower_id]);
        }
    } else {
        $con->query("DELETE FROM tbl_followers WHERE follower_id=$follower_id AND following_id=$following_id");
        $status = "unfollowed";
    }

    // Invalidate Redis caches so fresh authoritative data is reloaded on next query
    if ($redis) {
        try {
            $redis->del("user:{$follower_id}:counts");
            $redis->del("user:{$following_id}:counts");
            $redis->del("user:{$follower_id}:following");
            $redis->del("user:{$following_id}:following");
            $redis->del("user:{$follower_id}:following_loaded");
            $redis->del("user:{$following_id}:following_loaded");
        } catch (Exception $e) {}
    }

    $followers_count = 0;
    $countQ = $con->query("SELECT COUNT(*) FROM tbl_followers WHERE following_id=$following_id AND status='accepted'");
    if ($countQ && $row = $countQ->fetch_row()) {
        $followers_count = intval($row[0]);
    }
    
    // Notify the target user of the count change in real-time and broadcast to update all connected UI instances
    triggerWebSocket($following_id, "follow_counts_updated", ["follower_id" => $follower_id, "following_id" => $following_id, "status" => $status], true);
    
    echo json_encode(["ok" => true, "status" => $status, "followers_count" => $followers_count]);
    exit;
}

if(in_array($action, ['fetch_followers', 'fetch_following', 'fetch_friends', 'fetch_requested', 'fetch_sent', 'fetch_all_members'])){
    $uid = intval($_GET['user_id'] ?? $_POST['user_id'] ?? $input['user_id'] ?? 0);
    $search = $con->real_escape_string($_GET['search'] ?? $_POST['search'] ?? $input['search'] ?? '');
    
    $searchCond = "";
    if(!empty($search)){
        $searchCond = " AND (m.name LIKE '%$search%' OR m.city LIKE '%$search%')";
    }
    
    if($action === 'fetch_followers'){
        $sql = "SELECT m.id, m.name, m.profile_photo, m.city 
                FROM tbl_members m 
                JOIN tbl_followers f ON m.id = f.follower_id 
                WHERE f.following_id = $uid $searchCond";
    } elseif($action === 'fetch_following') {
        $sql = "SELECT m.id, m.name, m.profile_photo, m.city 
                FROM tbl_members m 
                JOIN tbl_followers f ON m.id = f.following_id 
                WHERE f.follower_id = $uid $searchCond";
    } elseif($action === 'fetch_friends') {
        $sql = "SELECT m.id, m.name, m.profile_photo, m.city 
                FROM tbl_members m 
                JOIN tbl_followers f ON m.id = f.follower_id 
                WHERE f.following_id = $uid AND f.status='accepted' $searchCond";
    } elseif($action === 'fetch_requested') {
        $sql = "SELECT m.id, m.name, m.profile_photo, m.city 
                FROM tbl_members m 
                JOIN tbl_followers f ON m.id = f.follower_id 
                WHERE f.following_id = $uid AND f.status='pending' $searchCond";
    } elseif($action === 'fetch_sent') {
        $sql = "SELECT m.id, m.name, m.profile_photo, m.city 
                FROM tbl_members m 
                JOIN tbl_followers f ON m.id = f.following_id 
                WHERE f.follower_id = $uid AND f.status='pending' $searchCond";
    } elseif($action === 'fetch_all_members'){
        $limit = intval($_GET['limit'] ?? 20);
        $offset = intval($_GET['offset'] ?? 0);
        $searchCondAll = "";
        if(!empty($search)){
            $searchCondAll = " AND (name LIKE '%$search%' OR city LIKE '%$search%')";
        }
        $sql = "SELECT id, name, profile_photo, city FROM tbl_members WHERE id != $follower_id $searchCondAll ORDER BY name ASC LIMIT $limit OFFSET $offset";
    }
    
    $res = $con->query($sql);
    $list = [];
    while($row = $res->fetch_assoc()){
        // Check if I follow them
        $check_i_follow = $con->query("SELECT status FROM tbl_followers WHERE follower_id=$follower_id AND following_id=".$row['id']);
        if ($r = $check_i_follow->fetch_assoc()) {
            $row['i_follow'] = true;
            $row['my_status'] = $r['status'];
        } else {
            $row['i_follow'] = false;
            $row['my_status'] = '';
        }
        
        // Check if they follow me
        $check_they_follow = $con->query("SELECT id FROM tbl_followers WHERE follower_id=".$row['id']." AND following_id=$follower_id");
        $row['follows_me'] = $check_they_follow->num_rows > 0;

        $list[] = $row;
    }
    echo json_encode(["ok" => true, "list" => $list]);
    exit;
}

if($action === 'get_counts'){
    $uid = intval($_REQUEST['user_id'] ?? $_POST['user_id'] ?? $input['user_id'] ?? $_GET['user_id'] ?? 0);
    
    if(!$uid) {
        echo json_encode(["ok" => false, "message" => "Target user missing"]);
        exit;
    }
    
    require_once 'RedisConfig.php';
    require_once 'RedisFollowHelper.php';
    $redis = RedisConfig::getConnection();
    $curr_id = intval($_REQUEST['current_user_id'] ?? $_POST['current_user_id'] ?? $input['current_user_id'] ?? $_GET['current_user_id'] ?? $current_user_id);
    
    if ($redis) {
        $counts = RedisFollowHelper::getCounts($redis, $con, $uid);
        
        $is_following = false;
        $is_requested = false;
        $is_connected = false;
        $follows_me = false;
        
        if ($curr_id) {
            $myStatus = RedisFollowHelper::getStatus($redis, $con, $curr_id, $uid);
            $theirStatus = RedisFollowHelper::getStatus($redis, $con, $uid, $curr_id);
            
            if ($myStatus === 'accepted') $is_following = true;
            elseif ($myStatus === 'pending') $is_requested = true;
            
            if ($theirStatus) {
                $follows_me = true;
                if ($theirStatus === 'accepted' && $is_following) $is_connected = true;
            }
        }

        echo json_encode([
            "ok" => true,
            "friends" => intval($counts['friends'] ?? 0),
            "followers" => intval($counts['followers'] ?? 0),
            "following" => intval($counts['following'] ?? 0),
            "requested" => intval($counts['requested'] ?? 0),
            "sent" => intval($counts['sent'] ?? 0),
            "posts" => intval($counts['posts'] ?? 0),
            "is_following" => $is_following,
            "is_requested" => $is_requested,
            "is_connected" => $is_connected,
            "follows_me" => $follows_me
        ]);
        exit;
    }

    // MySQL Fallback
    $friends = $con->query("SELECT COUNT(*) FROM tbl_followers WHERE following_id=$uid AND status='accepted'")->fetch_row()[0];
    $requested = $con->query("SELECT COUNT(*) FROM tbl_followers WHERE following_id=$uid AND status='pending'")->fetch_row()[0];
    $sent = $con->query("SELECT COUNT(*) FROM tbl_followers WHERE follower_id=$uid AND status='pending'")->fetch_row()[0];
    $posts = $con->query("SELECT COUNT(*) FROM tbl_posts WHERE user_id=$uid")->fetch_row()[0];
    
    $is_following = false;
    $is_requested = false;
    $is_connected = false;
    $follows_me = false;
    
    if($curr_id){
        $check = $con->query("SELECT status FROM tbl_followers WHERE follower_id=$curr_id AND following_id=$uid");
        if($check && $row = $check->fetch_assoc()){
            if($row['status'] === 'accepted') $is_following = true;
            else $is_requested = true;
        }
        
        $check_me = $con->query("SELECT status FROM tbl_followers WHERE follower_id=$uid AND following_id=$curr_id");
        if($check_me && $row_me = $check_me->fetch_assoc()){
            $follows_me = true;
            if($row_me['status'] === 'accepted' && $is_following) $is_connected = true;
        }
    }

    echo json_encode([
        "ok" => true,
        "friends" => $friends,
        "followers" => $con->query("SELECT COUNT(*) FROM tbl_followers WHERE following_id=$uid")->fetch_row()[0],
        "following" => $con->query("SELECT COUNT(*) FROM tbl_followers WHERE follower_id=$uid")->fetch_row()[0],
        "requested" => $requested,
        "sent" => $sent,
        "posts" => $posts,
        "is_following" => $is_following,
        "is_requested" => $is_requested,
        "is_connected" => $is_connected,
        "follows_me" => $follows_me
    ]);
    exit;
}

if ($action === 'fetch_suggestions') {
    $limit = intval($_GET['limit'] ?? 10);
    
    // Fetch users NOT current user AND NOT already followed/requested
    $sql = "SELECT id, name as full_name, profile_photo as photo, city 
            FROM tbl_members 
            WHERE id != $current_user_id 
            AND status != 'Blocked' 
            AND id NOT IN (
                SELECT following_id FROM tbl_followers WHERE follower_id = $current_user_id
            )
            ORDER BY RAND() 
            LIMIT $limit";
            
    $res = $con->query($sql);
    $list = [];
    while($row = $res->fetch_assoc()){
        $row['proposal_status'] = null; // Compatibility with component
        $list[] = $row;
    }
    echo json_encode(["status" => "success", "ok" => true, "data" => $list]);
    exit;
}

echo json_encode(["ok" => false, "message" => "Invalid action"]);
?>
