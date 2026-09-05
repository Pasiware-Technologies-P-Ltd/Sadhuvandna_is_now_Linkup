<?php
// Test connection to live DB using the domain
$host = "178.16.137.167";
$user = "u941015828_sadhuvandna";
$pass = "Sadhuvandna7832%^";
$db = "u941015828_sadhuvandna";

$c = mysqli_connect($host, $user, $pass, $db, 3306);
if ($c) {
    echo "SUCCESS\n";
} else {
    echo "ERROR: " . mysqli_connect_error() . "\n";
}
?>
