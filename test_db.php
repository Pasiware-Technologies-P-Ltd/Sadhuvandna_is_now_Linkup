<?php
require 'Api/connection.php';
$res = $con->query('SELECT id, user_id FROM tbl_marriage_profiles LIMIT 1');
print_r($res->fetch_assoc());
?>
