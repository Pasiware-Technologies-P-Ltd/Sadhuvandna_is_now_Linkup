<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include 'headers.php';
include 'connection.php';

if (!$con) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit;
}

// Session / Auth Logic
session_start();
header('Content-Type: application/json');
date_default_timezone_set("Asia/Kolkata");

// 1. Get User ID from Request or Session
$user_id = 0;
if (isset($_REQUEST['user_id']) && intval($_REQUEST['user_id']) > 0) {
    $user_id = intval($_REQUEST['user_id']);
}
else if (isset($_SESSION['sadhu_user_id'])) {
    $user_email = $_SESSION['sadhu_user_id'];
    $user = $con->query("SELECT id FROM tbl_members WHERE email='$user_email'")->fetch_assoc();
    if ($user)
        $user_id = $user['id'];
}

// 2. Handle Actions
$action = $_REQUEST['action'] ?? '';

// ACTION: LIKE
if ($action === 'like') {
    if ($user_id <= 0) {
        echo json_encode(["status" => "error", "message" => "Auth failed"]);
        exit;
    }
    $pid = intval($_POST['id']);
    $check = $con->query("SELECT id FROM tbl_likes WHERE post_id=$pid AND user_id=$user_id");

    if ($check->num_rows == 0) {
        $stmt = $con->prepare("INSERT INTO tbl_likes (post_id, user_id, date) VALUES (?, ?, NOW())");
        $stmt->bind_param("ii", $pid, $user_id);
        $stmt->execute();
    }
    else {
        $con->query("DELETE FROM tbl_likes WHERE post_id=$pid AND user_id=$user_id");
    }
    echo json_encode(["ok" => true]);
    exit;
}

// ACTION: COMMENT
if ($action === 'comment') {
    if ($user_id <= 0) {
        echo json_encode(["status" => "error", "message" => "Auth failed"]);
        exit;
    }
    $pid = intval($_POST['id']);
    $comment = trim($_POST['comment']);
    if ($comment != "") {
        $stmt = $con->prepare("INSERT INTO tbl_comments (post_id, user_id, comment, date) VALUES (?, ?, ?, NOW())");
        $stmt->bind_param("iis", $pid, $user_id, $comment);
        $stmt->execute();
    }
    echo json_encode(["ok" => true]);
    exit;
}

// ACTION: FETCH COMMENTS
if ($action === 'fetch_comments') {
    $pid = intval($_REQUEST['id']);
    $comments = [];
    $cres = $con->query("
        SELECT c.comment, c.date, m.name, m.profile_photo
        FROM tbl_comments c 
        JOIN tbl_members m ON c.user_id=m.id 
        WHERE c.post_id=$pid 
        ORDER BY c.date DESC
    ");
    while ($c = $cres->fetch_assoc()) {
        $comments[] = [
            'name' => htmlspecialchars($c['name']),
            'profile_photo' => htmlspecialchars($c['profile_photo']),
            'comment' => htmlspecialchars($c['comment']),
            'date' => date("d M Y, h:i A", strtotime($c['date']))
        ];
    }
    echo json_encode($comments);
    exit;
}

// ACTION: FETCH POST STATS BATCH
if ($action === 'fetch_post_stats_batch') {
    $post_ids_str = $_REQUEST['post_ids'] ?? '';
    if (empty($post_ids_str)) {
        echo json_encode(["status" => "error", "message" => "No post IDs provided"]);
        exit;
    }

    $idsArray = explode(',', $post_ids_str);
    $validIds = [];
    foreach ($idsArray as $id) {
        $vid = intval(trim($id));
        if ($vid > 0) $validIds[] = $vid;
    }

    if (count($validIds) == 0) {
        echo json_encode(["status" => "success", "data" => []]);
        exit;
    }

    $idsStr = implode(',', $validIds);
    $statsMap = [];

    // Initialize map
    foreach ($validIds as $id) {
        $statsMap[$id] = ['likes' => 0, 'user_liked' => false, 'comments' => []];
    }

    // Likes count
    $lres = $con->query("SELECT post_id, COUNT(*) as count FROM tbl_likes WHERE post_id IN ($idsStr) GROUP BY post_id");
    if ($lres) {
        while ($lrow = $lres->fetch_assoc()) {
            $statsMap[$lrow['post_id']]['likes'] = $lrow['count'];
        }
    }

    // User liked
    if ($user_id > 0) {
        $ulres = $con->query("SELECT post_id FROM tbl_likes WHERE post_id IN ($idsStr) AND user_id=$user_id");
        if ($ulres) {
            while ($ulrow = $ulres->fetch_assoc()) {
                $statsMap[$ulrow['post_id']]['user_liked'] = true;
            }
        }
    }

    // Comments
    $cres = $con->query("SELECT c.post_id, c.comment, c.date, m.name, m.profile_photo 
                         FROM tbl_comments c 
                         JOIN tbl_members m ON c.user_id=m.id 
                         WHERE c.post_id IN ($idsStr) 
                         ORDER BY c.date ASC");
    if ($cres) {
        while ($c = $cres->fetch_assoc()) {
            $c_pid = $c['post_id'];
            array_unshift($statsMap[$c_pid]['comments'], [
                'name' => $c['name'],
                'profile_photo' => $c['profile_photo'],
                'comment' => $c['comment'],
                'date' => $c['date']
            ]);
        }
    }

    echo json_encode(["status" => "success", "data" => $statsMap]);
    exit;
}

// ACTION: DEFAULT (FETCH POSTS)
// Use $user_id already resolved above


// 3. Filter & Pagination Logic
$filter_user_id = 0;
if (isset($_REQUEST['filter_user_id']) && intval($_REQUEST['filter_user_id']) > 0) {
    $filter_user_id = intval($_REQUEST['filter_user_id']);
}

// PAGINATION PARAMETERS
$limit = intval($_REQUEST['limit'] ?? 20);
$offset = intval($_REQUEST['offset'] ?? 0);
$is_lazy = isset($_REQUEST['lazy']) && $_REQUEST['lazy'] == 'true';

$whereClause = "";
if ($filter_user_id > 0) {
    $whereClause = "WHERE p.user_id = '$filter_user_id'";
}

if (isset($_REQUEST['post_id']) && intval($_REQUEST['post_id']) > 0) {
    $pid_filter = intval($_REQUEST['post_id']);
    $whereClause = "WHERE p.id = '$pid_filter'";
}

// Fetch posts matching website logic (tbl_posts p JOIN tbl_members m)
// Exclude blocked users
$whereBlocked = "m.status != 'Blocked'";
$finalWhere = $whereClause ? "$whereClause AND $whereBlocked" : "WHERE $whereBlocked";

$orderBy = "ORDER BY p.id DESC";
if ($filter_user_id == 0 && empty($_REQUEST['post_id'])) {
    $orderBy = "ORDER BY RAND()";
}

$query = "SELECT p.*, m.name, m.profile_photo, m.is_business, m.category 
          FROM tbl_posts p
          JOIN tbl_members m ON p.user_id = m.id 
          $finalWhere
          $orderBy
          LIMIT $limit OFFSET $offset";

$result = $con->query($query);
$postsRaw = [];
$postIds = [];

while ($p = $result->fetch_assoc()) {
    $postsRaw[] = $p;
    $postIds[] = intval($p['id']);
}

$posts = [];

if (count($postIds) > 0) {
    $idsStr = implode(',', $postIds);

    $likesCountMap = [];
    $userLikedMap = [];
    $commentsMap = [];

    if (!$is_lazy) {
        // 1. Fetch Likes Count for all posts at once
        $lres = $con->query("SELECT post_id, COUNT(*) as count FROM tbl_likes WHERE post_id IN ($idsStr) GROUP BY post_id");
        if ($lres) {
            while ($lrow = $lres->fetch_assoc()) {
                $likesCountMap[$lrow['post_id']] = $lrow['count'];
            }
        }

        // 2. Fetch User Liked status for all posts at once
        if ($user_id > 0) {
            $ulres = $con->query("SELECT post_id FROM tbl_likes WHERE post_id IN ($idsStr) AND user_id=$user_id");
            if ($ulres) {
                while ($ulrow = $ulres->fetch_assoc()) {
                    $userLikedMap[$ulrow['post_id']] = true;
                }
            }
        }

        // 3. Fetch Comments for all posts at once
        $cres = $con->query("SELECT c.post_id, c.comment, c.date, m.name, m.profile_photo 
                             FROM tbl_comments c 
                             JOIN tbl_members m ON c.user_id=m.id 
                             WHERE c.post_id IN ($idsStr) 
                             ORDER BY c.date ASC"); // ASC so when we array_unshift/push it forms correctly, or keep DESC and push
        if ($cres) {
            while ($c = $cres->fetch_assoc()) {
                $c_pid = $c['post_id'];
                if (!isset($commentsMap[$c_pid])) $commentsMap[$c_pid] = [];
                // To maintain DESC order (newest first)
                array_unshift($commentsMap[$c_pid], [
                    'name' => $c['name'],
                    'profile_photo' => $c['profile_photo'],
                    'comment' => $c['comment'],
                    'date' => $c['date']
                ]);
            }
        }
    }

    // Build the final array
    foreach ($postsRaw as $p) {
        $pid = intval($p['id']);
        $likes = $likesCountMap[$pid] ?? 0;
        $user_liked = isset($userLikedMap[$pid]);
        $comments = $commentsMap[$pid] ?? [];

        // Media
        $media = [];
        if (!empty($p['media'])) {
            $media = array_values(array_filter(explode(',', $p['media'])));
        }
        if (empty($media) && !empty($p['image'])) {
            $media[] = $p['image'];
        }

        $posts[] = [
            'id' => $pid,
            'user_id' => $p['user_id'],
            'name' => $p['name'] ?? 'Unknown User',
            'profile_photo' => $p['profile_photo'],
            'is_business' => $p['is_business'] ?? 0,
            'category' => $p['category'] ?? '',
            'description' => $p['status'] ?? $p['description'] ?? '',
            'link' => $p['link'] ?? '',
            'likes' => $likes,
            'user_liked' => $user_liked,
            'comments' => $comments,
            'media' => $media,
            'date' => $p['created_at'] ?? $p['date'],
            'stats_loaded' => !$is_lazy // Flag to indicate if stats are actual or placeholder
        ];
    }
}

echo json_encode(["status" => "success", "data" => $posts]);
?>
