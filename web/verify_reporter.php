<?php
// verify_reporter.php – verifies a reporter ID via QR code
include 'connection.php'; // $con MySQLi connection
date_default_timezone_set('Asia/Kolkata');
function e($s){return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');}
$id = $_GET['id'] ?? '';
if(!$id){echo '<h2 style="color:#c53030;">Invalid request – no ID.</h2>'; exit;}
$parts = explode('-', $id);
$userId = end($parts);
if(!ctype_digit($userId)){
    echo '<h2 style="color:#c53030;">Invalid ID format.</h2>'; exit;
}
$sql = "SELECT * FROM tbl_anchor_applications WHERE user_id = ? LIMIT 1";
$stmt = $con->prepare($sql);
if($stmt === false) {
    echo '<h2 style="color:#c53030;">Database error: ' . e($con->error) . '</h2>'; exit;
}
$stmt->bind_param('i', $userId);
$stmt->execute();
$res = $stmt->get_result();
if($res->num_rows === 0){
    echo '<h2 style="color:#c53030;">No application found.</h2>'; exit;
}
$app = $res->fetch_assoc();
$base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
if(!empty($app['photo'])){
    $photo = $base . '/uploads/anchor_applications/' . $app['photo'];
} elseif(!empty($app['profile_photo'])){
    $photo = $base . '/uploads/photo/' . $app['profile_photo'];
} elseif(!empty($app['legacy_photo'])){
    $photo = $base . '/uploads/photo/' . $app['legacy_photo'];
} else {
    $photo = '';
}
$created = new DateTime($app['created_at'] ?? 'now');
$expiry = clone $created;
$expiry->modify('+1 year');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporter Verification - Linkup</title>
    <link rel="icon" type="image/png" href="images/logo.png" />
    <!-- Google Fonts: Roboto -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Roboto', sans-serif; }
        .glass-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 40px -10px rgba(249, 115, 22, 0.15); /* Orange tinted shadow */
            border: 1px solid #ffedd5;
        }
    </style>
</head>
<body class="bg-orange-50 min-h-screen flex flex-col">

    <!-- Subtle Background Elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200 rounded-full blur-[100px] opacity-40"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-300 rounded-full blur-[120px] opacity-30"></div>
    </div>

    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-orange-300 sticky top-0 z-50 w-full">
        <div class="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <img src="images/logo.png" alt="Linkup Logo" class="w-10 h-10 object-contain">
                <h1 class="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">Linkup</h1>
            </div>
            <span class="text-xs sm:text-sm font-medium text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200">
                <i class="fa-solid fa-shield-halved mr-1"></i> Admin Portal
            </span>
        </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow flex items-center justify-center p-4 z-10 w-full">
        <div class="glass-card p-8 w-full max-w-md">
            
            <div class="space-y-6 text-center">
                
                <!-- Avatar/Icon Container -->
                <div class="inline-flex items-center justify-center w-20 h-20 bg-orange-100 text-orange-600 rounded-full mb-2 shadow-inner border-[4px] border-white ring-2 ring-orange-100">
                    <i class="fa-solid fa-user-tie text-3xl"></i>
                </div>

                <!-- Personal Info -->
                <div>
                    <p class="text-xs font-bold tracking-wider text-orange-500 uppercase mb-1">Official Reporter Details</p>
                    <h2 class="text-2xl font-bold text-gray-800"><?php echo e($app['name'] ?? 'N/A'); ?></h2>
                    <p class="text-gray-600 font-medium mt-1">
                        <i class="fa-solid fa-phone text-orange-400 mr-1 text-sm"></i> 
                        <?php echo e($app['phone'] ?? 'N/A'); ?>
                    </p>
                </div>

                <!-- Location Box -->
                <div class="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm">
                    <div class="grid grid-cols-2 gap-4 text-left">
                        <div class="border-r border-orange-200">
                            <p class="text-xs text-gray-500 font-medium uppercase"><i class="fa-solid fa-map-location-dot text-orange-400 mr-1"></i> State</p>
                            <p class="text-sm text-gray-800 font-bold truncate mt-1"><?php echo e($app['state'] ?? 'N/A'); ?></p>
                        </div>
                        <div class="pl-2">
                            <p class="text-xs text-gray-500 font-medium uppercase"><i class="fa-solid fa-building text-orange-400 mr-1"></i> District</p>
                            <p class="text-sm text-gray-800 font-bold truncate mt-1"><?php echo e($app['district'] ?? 'N/A'); ?></p>
                        </div>
                    </div>
                </div>

                <!-- Status Badge -->
                <div class="pt-3 pb-2">
                    <?php if(strtolower($app['status'] ?? '') === 'verified'): ?>
                        <div class="inline-flex flex-col items-center justify-center">
                            <div class="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-6 py-2.5 rounded-full font-bold shadow-sm text-lg">
                                <i class="fa-solid fa-circle-check text-xl"></i>
                                Verified Reporter
                            </div>
                        </div>
                    <?php else: ?>
                        <div class="inline-flex flex-col items-center justify-center">
                            <div class="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-6 py-2.5 rounded-full font-bold shadow-sm text-lg">
                                <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                                Verification Pending
                            </div>
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Footer Details -->
                <div class="text-sm pt-4 border-t border-gray-100 flex justify-between items-center text-gray-500 px-2">
                    <span><i class="fa-regular fa-calendar text-orange-400 mr-1"></i> Valid Till:</span>
                    <span class="font-bold text-gray-800"><?php echo e($expiry->format('d M Y')); ?></span>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-orange-200 py-6 w-full z-10 mt-auto">
        <div class="max-w-5xl mx-auto px-4 text-center">
            <p class="text-gray-600 text-sm">
                &copy; <?php echo date('Y'); ?> <span class="font-bold text-orange-600">Linkup</span>. All rights reserved.
            </p>
            <p class="text-gray-400 text-xs mt-1">
                Last checked on: <?php echo e(date('d M Y, h:i A')); ?>
            </p>
        </div>
    </footer>

</body>
</html>
<?php
?>
