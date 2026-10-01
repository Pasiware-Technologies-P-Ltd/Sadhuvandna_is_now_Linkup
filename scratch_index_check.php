<?php
require 'Api/connection.php';
$res = $con->query("SHOW INDEXES FROM tbl_likes");
while ($row = $res->fetch_assoc()) { print_r($row); }
$res = $con->query("SHOW INDEXES FROM tbl_followers");
while ($row = $res->fetch_assoc()) { print_r($row); }
?>
