<?php
require_once 'Api/connection.php'; $res = $con->query("SELECT id FROM tbl_posts WHERE user_id = '1732' LIMIT 1"); if($row = $res->fetch_assoc()) echo 'Post ID: ' . $row['id']; else echo 'No post found';
