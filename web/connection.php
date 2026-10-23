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

$host = getenv('DB_HOST') ?: "178.16.137.167";
$user = getenv('DB_USER') ?: "u941015828_sadhuvandna";
$pass = getenv('DB_PASS') ?: "Sadhuvandna7832%^";
$name = getenv('DB_NAME') ?: "u941015828_sadhuvandna";
$port = getenv('DB_PORT') ?: 3307;

$con = mysqli_connect($host, $user, $pass, $name, (int)$port);

if (!$con) {
    // If connection fails, we log it but don't output anything yet
    // because it will break AJAX/JSON responses.
    error_log("Database connection failed: " . mysqli_connect_error());
} else {
    mysqli_set_charset($con, "utf8mb4");
    mysqli_query($con, "SET NAMES utf8mb4");
    mysqli_query($con, "SET CHARACTER SET utf8mb4");
    mysqli_query($con, "SET SESSION collation_connection = utf8mb4_unicode_ci");
    $con->query("SET time_zone = '+05:30'");
}

