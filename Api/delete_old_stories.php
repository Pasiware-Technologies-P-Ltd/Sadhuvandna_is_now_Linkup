<?php
include("connection.php");

// get all old stories (older than 1 day)
$old_stories = $con->query("SELECT media FROM tbl_stories WHERE date < (NOW() - INTERVAL 1 DAY)");

while($s = $old_stories->fetch_assoc()) {
    $media = trim($s['media']);
    if(!$media) continue;

    // Use ../ to go up from Api folder to the root uploads folder
    // Extracting basename ensures we only deal with the file name for safety.
    $file_path = __DIR__ . "/../uploads/stories/" . basename($media);

    if (file_exists($file_path) && !is_dir($file_path)) {
        unlink($file_path);
    }
}

// delete from database
$con->query("DELETE FROM tbl_stories WHERE date < (NOW() - INTERVAL 1 DAY)");
// Also clean up related views
$con->query("DELETE FROM tbl_story_views WHERE story_id NOT IN (SELECT id FROM tbl_stories)");

echo json_encode(["status" => "success", "message" => "Old stories deleted safely"]);
?>
