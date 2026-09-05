<?php
$c = mysqli_connect('178.16.137.167', 'u941015828_sadhuvandna', 'Sadhuvandna7832%^', 'u941015828_sadhuvandna', 3307);
mysqli_report(MYSQLI_REPORT_OFF);

// Check tbl_business_details table
$res = $c->query("SHOW TABLES LIKE 'tbl_business_details'");
if ($res->num_rows > 0) {
    echo "TABLE EXISTS\n";
    $res2 = $c->query("DESCRIBE tbl_business_details");
    while($row = $res2->fetch_assoc()) {
        echo json_encode($row) . "\n";
    }
} else {
    echo "TABLE DOES NOT EXIST\n";
    // Create it
    $c->query("CREATE TABLE IF NOT EXISTS tbl_business_details (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES tbl_members(id) ON DELETE CASCADE
    )");
    if ($c->error) {
        echo "CREATE ERROR: " . $c->error . "\n";
    } else {
        echo "TABLE CREATED SUCCESSFULLY\n";
    }
}
?>
