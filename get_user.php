<?php
require_once 'Api/connection.php'; $res = $con->query("SELECT id, name FROM tbl_members WHERE mobile = '9795789210'"); if($row = $res->fetch_assoc()) echo 'ID: ' . $row['id'] . ' Name: ' . $row['name']; else echo 'User not found';
