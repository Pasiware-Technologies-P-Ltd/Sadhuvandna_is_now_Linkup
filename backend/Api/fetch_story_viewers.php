<?php
include("headers.php");
include("connection.php");

// Get viewers for a story
$story_id = intval($_GET['story_id'] ?? 0);

if ($story_id > 0) {
    // Join tbl_story_reactions to get reaction_type
    $res = $con->query("
        SELECT v.viewed_at as date, v.viewer_id, m.id as user_id, m.name, m.profile_photo,
               r.reaction_type
        FROM tbl_story_views v
        JOIN tbl_members m ON v.viewer_id = m.id
        LEFT JOIN tbl_story_reactions r ON r.story_id = v.story_id AND r.user_id = v.viewer_id
        WHERE v.story_id = $story_id
        ORDER BY v.viewed_at DESC
    ");
    
    $viewers = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $viewers[] = [
                "id" => $row['user_id'] ?? $row['viewer_id'],
                "user_id" => $row['user_id'] ?? $row['viewer_id'],
                "name" => htmlspecialchars($row['name'] ?? ''),
                "profile_photo" => htmlspecialchars($row['profile_photo'] ?? ''),
                "reaction_type" => $row['reaction_type'] ?? null,
                "date" => date("d M Y, h:i A", strtotime($row['date']))
            ];
        }
    }

    // Reaction counts
    $sumQ = $con->query("SELECT reaction_type, COUNT(*) as count FROM tbl_story_reactions WHERE story_id = $story_id GROUP BY reaction_type");
    $summary = [];
    $total_reactions = 0;
    if ($sumQ) {
        while ($r = $sumQ->fetch_assoc()) {
            $summary[$r['reaction_type']] = intval($r['count']);
            $total_reactions += intval($r['count']);
        }
    }
    
    echo json_encode([
        "status" => "success", 
        "data" => $viewers,
        "total_reactions" => $total_reactions,
        "reactions_summary" => $summary
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Invalid story ID"]);
}
?>
