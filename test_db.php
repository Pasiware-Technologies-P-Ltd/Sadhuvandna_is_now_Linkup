<?php
$c = mysqli_connect('localhost', 'root', '');
if($c){
    echo "CONNECTED TO LOCAL MYSQL!\n";
    $res = mysqli_query($c, 'SHOW DATABASES');
    while($row = mysqli_fetch_array($res)){
        echo $row[0] . "\n";
    }
} else {
    echo "ERROR: " . mysqli_connect_error();
}
?>
