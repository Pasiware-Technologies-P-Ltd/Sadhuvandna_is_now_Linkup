<?php
function get_db_connection() {
    $host = getenv('DB_HOST') ?: "e4skgkwwk0s0gkso48oc40kg";
    $user = getenv('DB_USER') ?: "u941015828_sadhuvandna";
    $pass = getenv('DB_PASS') ?: "Sadhuvandna7832%^";
    $name = getenv('DB_NAME') ?: "u941015828_sadhuvandna";
    $port = (int)(getenv('DB_PORT') ?: 3306);

    $con = @mysqli_connect($host, $user, $pass, $name, $port);
    if (!$con || mysqli_connect_errno()) {
        error_log("Failed to connect to MySQL: " . mysqli_connect_error());
        return null;
    }
    mysqli_set_charset($con, "utf8mb4");

    // EXTRA safety
    @mysqli_query($con, "SET NAMES utf8mb4");
    @mysqli_query($con, "SET CHARACTER SET utf8mb4");
    @mysqli_query($con, "SET SESSION collation_connection = utf8mb4_unicode_ci");
    @$con->query("SET time_zone = '+05:30'");
    return $con;
}

function ensure_db_connection(&$con) {
    $needsReconnect = false;
    if (!$con || !($con instanceof mysqli)) {
        $needsReconnect = true;
    } else {
        try {
            if (!@mysqli_ping($con)) {
                $needsReconnect = true;
            }
        } catch (Throwable $e) {
            $needsReconnect = true;
        }
    }

    if ($needsReconnect) {
        if ($con instanceof mysqli) {
            try { @$con->close(); } catch (Throwable $e) {}
        }
        $con = get_db_connection();
        if (!$con) {
            throw new Exception("MySQL reconnection failed: " . mysqli_connect_error());
        }
    }
    return $con;
}

// Initial connection for standard request lifecycle
$con = get_db_connection();
if (!$con) {
    if (php_sapi_name() !== 'cli') {
        echo "Failed to connect to MySQL: " . mysqli_connect_error();
        exit();
    }
}
?>
