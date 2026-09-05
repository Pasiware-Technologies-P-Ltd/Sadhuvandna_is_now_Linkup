<?php
$c = mysqli_connect('178.16.137.167', 'u941015828_sadhuvandna', 'Sadhuvandna7832%^', 'u941015828_sadhuvandna', 3307);
if ($c) {
    // Ignore error if column already exists
    $res = @mysqli_query($c, "ALTER TABLE tbl_business_details ADD COLUMN full_address TEXT DEFAULT NULL AFTER district");
    if($res) echo "SUCCESS ALTER TABLE\n";
    else echo "EXPECTED OR ERROR: " . mysqli_error($c) . "\n";
} else {
    echo "FAIL: " . mysqli_connect_error();
}
?>
