<?php
require_once 'Api/connection.php';
$res = $con->query("SHOW COLUMNS FROM tbl_members");
while($row = $res->fetch_assoc()) echo $row['Field'] . "\n";
?>
