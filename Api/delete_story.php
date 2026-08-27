<?php
include 'headers.php';
include 'connection.php';

$user_id = $_POST['user_id'] ?? 0;
$story_id = $_POST['story_id'] ?? 0;

if (!$user_id || !$story_id) {
    echo json_encode(["status" => "error", "message" => "Missing parameters"]);
    exit;
}

// Get story details to delete file
$stmt = $con->prepare("SELECT media FROM tbl_stories WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $story_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $mediaPath = $row['media'];
    
    // Attempt to delete file if it exists
    $fullPath = "../" . $mediaPath;
    if (file_exists($fullPath) && !is_dir($fullPath)) {
        unlink($fullPath);
    }
    
    // Delete from database
    $delStmt = $con->prepare("DELETE FROM tbl_stories WHERE id = ? AND user_id = ?");
    $delStmt->bind_param("ii", $story_id, $user_id);
    if ($delStmt->execute()) {
        // Also clean up any views associated with this story
        $viewStmt = $con->prepare("DELETE FROM tbl_story_views WHERE story_id = ?");
        $viewStmt->bind_param("i", $story_id);
        $viewStmt->execute();
        
        echo json_encode(["status" => "success", "message" => "Story deleted"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Database error"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Story not found or unauthorized"]);
}
?>
