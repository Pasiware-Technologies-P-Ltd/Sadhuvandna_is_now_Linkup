<?php
ob_start();
include_once("connection.php");
header('Content-Type: application/json');

$user_mobile = $_SESSION['sadhu_user_id'] ?? '';

if(!$con){
    ob_end_clean();
    echo json_encode(["error" => "Database connection failed"]);
    exit;
}

if(!$user_mobile){ 
    ob_end_clean();
    echo json_encode(["error" => "Session expired or user not logged in"]); 
    exit; 
}

$user_res = $con->query("SELECT id FROM tbl_members WHERE mobile='$user_mobile'");
$user = ($user_res) ? $user_res->fetch_assoc() : null;
if(!$user){ echo json_encode(["error" => "User not found"]); exit; }
$user_id = $user['id'];

if($_SERVER['REQUEST_METHOD'] === 'POST'){
  $pid = isset($_POST['id']) ? intval($_POST['id']) : 0;
  $reason = isset($_POST['reason']) ? trim($_POST['reason']) : '';

  if($pid <= 0){
      ob_end_clean();
      echo json_encode(["error" => "Invalid post ID"]);
      exit;
  }
  
  if(empty($reason)){
      ob_end_clean();
      echo json_encode(["error" => "Reason is required"]);
      exit;
  }

  // Create table if not exists with reason column
  $con->query("CREATE TABLE IF NOT EXISTS tbl_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      reason TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
  )");

  // Check if column 'reason' exists (just in case they already ran previous code)
  $col_check = $con->query("SHOW COLUMNS FROM tbl_reports LIKE 'reason'");
  if($col_check && $col_check->num_rows == 0){
      $con->query("ALTER TABLE tbl_reports ADD COLUMN reason TEXT AFTER user_id");
  }

  $check = $con->query("SELECT id FROM tbl_reports WHERE post_id=$pid AND user_id=$user_id");
  if($check && $check->num_rows == 0){
    $stmt = $con->prepare("INSERT INTO tbl_reports (post_id, user_id, reason, date) VALUES (?, ?, ?, NOW())");
    if($stmt){
        $stmt->bind_param("iis", $pid, $user_id, $reason);
        $stmt->execute();
    }
  } else {
    ob_end_clean();
    echo json_encode(["error" => "You have already reported this post"]);
    exit;
  }
  
  ob_end_clean();
  echo json_encode(["ok" => true]);
  exit;
}

ob_end_clean();
echo json_encode(["error" => "Invalid request"]);
exit;
