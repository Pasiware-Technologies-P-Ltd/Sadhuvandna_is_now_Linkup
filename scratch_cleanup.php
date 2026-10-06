<?php
require 'Api/connection.php';
require 'Api/RedisConfig.php';

$r = RedisConfig::getConnection();
$r->del('post:1:comments_loaded');
$r->del('post:1:comments');
echo "Redis cleared\n";

$con->query("DELETE FROM tbl_comments WHERE id IN (211,212,213,222) AND post_id=1");
echo "MySQL test comments deleted: " . $con->affected_rows . " rows\n";

// Verify
$res = $con->query("SELECT COUNT(*) as cnt FROM tbl_comments WHERE post_id=1");
$row = $res->fetch_assoc();
echo "Remaining comments in MySQL for post 1: " . $row['cnt'] . "\n";
