<?php
$c = mysqli_connect('178.16.137.167', 'u941015828_sadhuvandna', 'Sadhuvandna7832%^', 'u941015828_sadhuvandna', 3307);
if ($c) {
    $res = mysqli_query($c, "DESCRIBE tbl_members");
    while($row = mysqli_fetch_assoc($res)) {
        echo json_encode($row) . "\n";
    }
}
?>
