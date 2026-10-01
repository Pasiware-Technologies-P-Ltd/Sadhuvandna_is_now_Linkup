<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include("connection.php");

$data = json_decode(file_get_contents("php://input"), true);
$message_id = $data['message_id'] ?? $_POST['message_id'] ?? null;
$my_id = $data['my_profile_id'] ?? $_POST['my_profile_id'] ?? null;
$receiver_id = $data['receiver_id'] ?? $_POST['receiver_id'] ?? null;
$platform = $data['platform'] ?? $_POST['platform'] ?? 'marriage';

if ($message_id && $my_id) {
    if ($platform === 'community') {
        $con->query("UPDATE tbl_community_chat SET seen = 1 WHERE id = '$message_id'");
    } else {
        $con->query("UPDATE tbl_messages SET seen = 1 WHERE id = '$message_id'");
    }
    
    // Broadcast seen event back to sender
    $url = 'http://localhost:3000/api/trigger';
    $postData = [
        'room' => "user_{$receiver_id}",
        'type' => 'messages_seen',
        'payload' => [
            'viewer_id' => $my_id,
            'message_id' => $message_id,
            'platform' => $platform
        ]
    ];
    $options = [
        'http' => [
            'header'  => "Content-type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($postData)
        ]
    ];
    @file_get_contents($url, false, stream_context_create($options));
    
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Invalid parameters"]);
}
?>
