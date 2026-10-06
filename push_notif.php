<?php
require_once 'Api/QueueManager.php'; require_once 'Api/connection.php'; $redis = RedisConfig::getConnection(); $redis->lPush(QueueManager::QUEUE_NOTIFICATIONS, json_encode(['type' => 'follow', 'follower_id' => 1, 'following_id' => 1732, 'status' => 'pending'])); echo 'Pushed!';
