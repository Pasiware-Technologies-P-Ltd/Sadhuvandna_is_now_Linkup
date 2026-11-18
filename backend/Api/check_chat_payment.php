<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

try {
    include 'connection.php';

    // Handle JSON Input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $user_id = intval($_REQUEST['user_id'] ?? $data['user_id'] ?? 0);
    $receiver_id = intval($_REQUEST['receiver_id'] ?? $data['receiver_id'] ?? 0); 
    $platform = $_REQUEST['platform'] ?? $data['platform'] ?? 'marriage';

    if(!$user_id){
        echo json_encode(["status" => "error", "message" => "User ID required"]);
        exit;
    }

    // 1. COMMUNITY CHAT -> No payment required, check connection & 2-message limit
    if($platform === 'community'){
        $is_connected = false;
        $sent_count = 0;

        if ($receiver_id > 0) {
            // Check mutual connection in tbl_followers
            $chk1 = $con->prepare("SELECT id FROM tbl_followers WHERE follower_id = ? AND following_id = ? AND status = 'accepted' LIMIT 1");
            if ($chk1) {
                $chk1->bind_param("ii", $user_id, $receiver_id);
                $chk1->execute();
                $r1 = $chk1->get_result();

                $chk1->bind_param("ii", $receiver_id, $user_id);
                $chk1->execute();
                $r2 = $chk1->get_result();

                if ($r1 && $r1->num_rows > 0 && $r2 && $r2->num_rows > 0) {
                    $is_connected = true;
                }
            }

            if (!$is_connected) {
                $cq = $con->prepare("SELECT COUNT(*) FROM tbl_messages WHERE sender_id = ? AND receiver_id = ? AND chat_platform = 'community' AND is_deleted = 0");
                if ($cq) {
                    $cq->bind_param("ii", $user_id, $receiver_id);
                    $cq->execute();
                    $sent_count = intval($cq->get_result()->fetch_row()[0] ?? 0);
                }
            }
        }

        $limit_reached = (!$is_connected && $sent_count >= 2);

        echo json_encode([
            "status" => "success", 
            "paid" => true, 
            "my_profile_id" => $user_id,
            "reason" => "community",
            "is_connected" => $is_connected,
            "sent_count" => $sent_count,
            "message_limit" => 2,
            "limit_reached" => $limit_reached
        ]);
        exit;
    }

    // 2. MARRIAGE CHAT -> Check Payment & History
    $mq = $con->query("SELECT id FROM tbl_marriage_profiles WHERE user_id='$user_id' LIMIT 1");
    $mp = ($mq && $mq->num_rows > 0) ? $mq->fetch_assoc() : null;
    $my_profile_id = $mp['id'] ?? 0;

    if(!$my_profile_id){
        echo json_encode(["status" => "error", "message" => "Marriage Profile not found"]);
        exit;
    }

    // Check Messages History
    $msg_check = $con->query("
        SELECT id FROM tbl_messages
        WHERE 
            (
                (sender_id = '$my_profile_id' AND receiver_id = '$receiver_id')
                OR
                (sender_id = '$receiver_id' AND receiver_id = '$my_profile_id')
            )
            AND chat_platform = 'marriage'
        LIMIT 1
    ");

    if($msg_check && $msg_check->num_rows > 0){
        echo json_encode(["status" => "success", "paid" => true, "my_profile_id" => $my_profile_id, "reason" => "history"]);
        exit;
    }

    // Check Wallet
    $check = $con->query("
        SELECT id FROM tbl_wallet
        WHERE 
            (
                (sender_id = '$my_profile_id' AND receiver_id = '$receiver_id')
                OR
                (sender_id = '$receiver_id' AND receiver_id = '$my_profile_id')
            )
            AND status = 'success'
        LIMIT 1
    ");

    if($check && $check->num_rows > 0){
        echo json_encode(["status" => "success", "paid" => true, "my_profile_id" => $my_profile_id]);
    } else {
        echo json_encode(["status" => "success", "paid" => false, "my_profile_id" => $my_profile_id, "payment_url" => "payment.php?sender=$my_profile_id&receiver=$receiver_id"]);
    }

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>