<?php
include 'headers.php';
include 'connection.php';

// Safe additive migration: create tbl_story_reactions if not exists
$sql = "CREATE TABLE IF NOT EXISTS `tbl_story_reactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `story_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `reaction_type` VARCHAR(30) NOT NULL DEFAULT 'love',
    `created_at` DATETIME NOT NULL,
    UNIQUE KEY `uniq_story_user` (`story_id`, `user_id`),
    INDEX `idx_story_id` (`story_id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if ($con->query($sql)) {
    echo json_encode(["status" => "success", "message" => "tbl_story_reactions table created or already exists."]);
} else {
    echo json_encode(["status" => "error", "message" => "Error creating table: " . $con->error]);
}
?>