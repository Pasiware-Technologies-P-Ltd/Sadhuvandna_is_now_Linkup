<?php
$c = mysqli_connect('178.16.137.167', 'u941015828_sadhuvandna', 'Sadhuvandna7832%^', 'u941015828_sadhuvandna', 3307);

// Check mysqli_sql_exception mode
mysqli_report(MYSQLI_REPORT_OFF);

$businessname = "Test Biz";
$email = "testbiz@test.com";
$phone_no = "9999999999";
$mock_empty = "";
$date_now = date('Y-m-d');
$is_business = 1;
$parent_userid = 1765;
$category = "Test";
$district = "Varanasi";

$insert_member = $c->prepare("INSERT INTO tbl_members (name, email, mobile, password, dob, gender, city, cast, profile_photo, date, is_business, parent_userid, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
if (!$insert_member) {
    echo "PREPARE FAILED: " . $c->error . "\n";
    exit;
}
$insert_member->bind_param("ssssssssssiis", 
    $businessname, 
    $email,
    $phone_no,
    $mock_empty,
    $mock_empty,
    $mock_empty,
    $district,
    $mock_empty,
    $mock_empty,
    $date_now,
    $is_business,
    $parent_userid,
    $category
);

if ($insert_member->execute()) {
    $new_id = $insert_member->insert_id;
    echo "MEMBER INSERTED id=$new_id\n";
    // Clean up
    $c->query("DELETE FROM tbl_members WHERE id=$new_id");
    echo "CLEANED UP\n";
} else {
    echo "EXECUTE FAILED: " . $insert_member->error . "\n";
}
?>
