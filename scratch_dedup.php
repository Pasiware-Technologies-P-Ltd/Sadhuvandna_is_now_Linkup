<?php
require 'Api/connection.php';
$res = $con->query("SELECT post_id, user_id, COUNT(*) as cnt FROM tbl_likes GROUP BY post_id, user_id HAVING cnt > 1");
if ($res->num_rows > 0) {
    echo "Found " . $res->num_rows . " duplicate pairs.\n";
} else {
    echo "No duplicates found.\n";
}
?>
