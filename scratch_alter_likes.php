<?php
require 'Api/connection.php';

// 1. Delete duplicates just in case
$con->query("
    DELETE t1 FROM tbl_likes t1
    INNER JOIN tbl_likes t2 
    WHERE t1.id < t2.id AND t1.post_id = t2.post_id AND t1.user_id = t2.user_id
");

// 2. Add Unique Key
if ($con->query("ALTER TABLE tbl_likes ADD UNIQUE KEY post_user (post_id, user_id)")) {
    echo "UNIQUE KEY added to tbl_likes.\n";
} else {
    echo "Error: " . $con->error . "\n";
}
?>
