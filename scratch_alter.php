<?php
require 'Api/connection.php';
$con->query("SET SESSION sql_mode=''");
$con->query('ALTER TABLE tbl_messages ADD COLUMN client_message_id VARCHAR(64) DEFAULT NULL');
$con->query('ALTER TABLE tbl_messages ADD UNIQUE KEY uq_client_msg (client_message_id)');
$con->query('ALTER TABLE tbl_group_messages ADD COLUMN client_message_id VARCHAR(64) DEFAULT NULL');
$con->query('ALTER TABLE tbl_group_messages ADD UNIQUE KEY uq_group_client_msg (client_message_id)');
echo 'Schema altered.';
?>
