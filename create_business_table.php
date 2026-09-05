<?php
$c = mysqli_connect('178.16.137.167', 'u941015828_sadhuvandna', 'Sadhuvandna7832%^', 'u941015828_sadhuvandna', 3307);
mysqli_report(MYSQLI_REPORT_OFF);

// Check engine of tbl_members
$res = $c->query("SHOW TABLE STATUS LIKE 'tbl_members'");
$row = $res->fetch_assoc();
echo "Engine: " . $row['Engine'] . "\n";

// Create table WITHOUT foreign key constraint
$result = $c->query("CREATE TABLE IF NOT EXISTS tbl_business_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone_no VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    website_url VARCHAR(255) DEFAULT NULL,
    social_media_account VARCHAR(255) DEFAULT NULL,
    country VARCHAR(100) DEFAULT NULL,
    state VARCHAR(100) DEFAULT NULL,
    district VARCHAR(100) DEFAULT NULL,
    full_address TEXT DEFAULT NULL,
    pincode VARCHAR(20) DEFAULT NULL,
    opening_hours VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

if ($result) {
    echo "TABLE CREATED SUCCESSFULLY\n";
} else {
    echo "CREATE ERROR: " . $c->error . "\n";
}
?>
