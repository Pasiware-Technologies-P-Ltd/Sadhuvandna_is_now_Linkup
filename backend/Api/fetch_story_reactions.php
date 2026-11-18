<?php
include("headers.php");
require_once("connection.php");

$story_id = intval($_GET['story_id'] ?? $_POST['story_id'] ?? 0);
$user_id = intval($_GET['user_id'] ?? $_POST['user_id'] ?? 0);

if (!$story_id) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid story ID']);
    exit;
}

// 1. Get user's own reaction if user_id provided
$user_reaction = null;
if ($user_id > 0) {
    $uq = $con->prepare("SELECT reaction_type FROM tbl_story_reactions WHERE story_id = ? AND user_id = ? LIMIT 1");
    $uq->bind_param("ii", $story_id, $user_id);
    $uq->execute();
    $uRes = $uq->get_result();
    if ($uRes && $uRes->num_rows > 0) {
        $user_reaction = $uRes->fetch_assoc()['reaction_type'];
    }
}

// 2. Count total reactions
$countQ = $con->prepare("SELECT COUNT(*) as total FROM tbl_story_reactions WHERE story_id = ?");
$countQ->bind_param("i", $story_id);
$countQ->execute();
$total_reactions = $countQ->get_result()->fetch_assoc()['total'] ?? 0;

// 3. Breakdown by reaction
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
    'user_reaction' => $user_reaction,
    'total_reactions' => intval($total_reactions),
    'reactions_summary' => $summary
]);
?>