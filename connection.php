<?php
ob_start();
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 2592000,
        'path' => '/',
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Suppress errors for production unless needed for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

$con = mysqli_connect("localhost", "root", "", "sadhu_vandana");

if (!$con) {
    // If connection fails, we log it but don't output anything yet
    // because it will break AJAX/JSON responses.
    error_log("Database connection failed: " . mysqli_connect_error());
} else {
    mysqli_set_charset($con, "utf8mb4");
}
