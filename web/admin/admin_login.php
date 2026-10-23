<?php
// session_start();
include("../connection.php");

$error = "";

// --- Already Logged In ---
if (isset($_SESSION['admin_id'])) {
    echo "<script>window.location.href='index.php';</script>";
    exit;
}

// --- Remember Me Auto Login ---
if (isset($_COOKIE['sadhu_admin_id']) && isset($_COOKIE['sadhu_admin_token'])) {

    $cid = $_COOKIE['sadhu_admin_id'];
    $ctoken = $_COOKIE['sadhu_admin_token'];

    $q = mysqli_query($con, "SELECT * FROM tbl_admin WHERE admin_id='$cid' LIMIT 1");

    if (mysqli_num_rows($q) == 1) {
        $row = mysqli_fetch_assoc($q);

        if ($ctoken == sha1($row['password'])) {

            $_SESSION['admin_id'] = $row['admin_id'];
            $_SESSION['admin_name'] = $row['username'];

            echo "<script>window.location.href='index.php';</script>";
            exit;
        }
    }
}


// ================= LOGIN SUBMIT =================
if (isset($_POST['login'])) {

    $username = $_POST['username'];
    $password = $_POST['password'];
    $remember = isset($_POST['remember']);

    $q = mysqli_query($con, "SELECT * FROM tbl_admin WHERE username='$username' LIMIT 1");

    if (mysqli_num_rows($q) == 1) {

        $row = mysqli_fetch_assoc($q);

        if (password_verify($password, $row['password'])) {

            $_SESSION['admin_id'] = $row['admin_id'];
            $_SESSION['admin_name'] = $row['username'];

            if ($remember) {
                setcookie("sadhu_admin_id", $row['admin_id'], time() + (86400 * 7), "/");
                setcookie("sadhu_admin_token", sha1($row['password']), time() + (86400 * 7), "/");
            }

           echo "<script>window.location.href='index.php';</script>";
            exit;

        } else {
            $error = "❌ Wrong Password!";
        }

    } else {
        $error = "❌ Username Not Found!";
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Admin Login - Linkup</title>
    <!-- Centralized Design System -->
    <link rel="stylesheet" href="../css/theme.css"/>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
</head>

<body class="bg-slate-50 min-h-screen flex items-center justify-center px-4">

    <div class="premium-card p-8 sm:p-10 w-full max-w-md shadow-xl border border-slate-200/80">

        <div class="text-center mb-6">
            <div class="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-sm overflow-hidden bg-white border border-slate-200">
                <img src="../images/logo.png" alt="Linkup" class="w-full h-full object-cover">
            </div>
            <h1 class="text-xl font-extrabold text-slate-900 mt-4 tracking-tight">Admin Console</h1>
            <p class="text-slate-400 text-xs font-medium">Enter your credentials to access Linkup admin suite</p>
        </div>

        <?php if (!empty($error)) { ?>
            <div class="bg-rose-50 border border-rose-200 text-rose-700 py-2.5 px-4 mb-5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation text-rose-500"></i> <?= $error ?>
            </div>
        <?php } ?>

        <form method="POST" class="space-y-4">

            <!-- Username -->
            <div>
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Username</label>
                <div class="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/60 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <i class="fa-solid fa-user text-slate-400 text-xs mr-3"></i>
                    <input type="text" name="username" required placeholder="Enter admin username"
                           class="flex-1 outline-none text-xs font-medium text-slate-800 bg-transparent">
                </div>
            </div>

            <!-- Password -->
            <div>
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">Password</label>
                <div class="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/60 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <i class="fa-solid fa-lock text-slate-400 text-xs mr-3"></i>
                    <input type="password" id="adminPassword" name="password" required
                           class="flex-1 outline-none text-xs font-medium text-slate-800 bg-transparent" placeholder="Enter password">
                    <button type="button" id="togglePasswordBtn" class="text-slate-400 hover:text-slate-600 transition-colors ml-2 focus:outline-none cursor-pointer" title="Toggle password visibility">
                        <i id="togglePasswordIcon" class="fa-solid fa-eye text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Remember Me -->
            <label class="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer select-none py-1">
                <input type="checkbox" name="remember" class="w-4 h-4 text-blue-600 rounded border-slate-300">
                Remember my session
            </label>

            <!-- Login Button -->
            <button type="submit" name="login"
                class="btn-brand-primary w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer">
                <i class="fa-solid fa-right-to-bracket text-xs"></i> Sign In to Admin Console
            </button>

        </form>

        <!-- Footer -->
        <p class="text-center text-xs text-gray-500 mt-6">
            © <?= date("Y") ?> Admin Panel. All Rights Reserved.
        </p>

    </div>

    <script>
        const togglePasswordBtn = document.getElementById('togglePasswordBtn');
        const adminPassword = document.getElementById('adminPassword');
        const togglePasswordIcon = document.getElementById('togglePasswordIcon');

        if (togglePasswordBtn && adminPassword && togglePasswordIcon) {
            togglePasswordBtn.addEventListener('click', function () {
                const isPassword = adminPassword.getAttribute('type') === 'password';
                adminPassword.setAttribute('type', isPassword ? 'text' : 'password');
                togglePasswordIcon.classList.toggle('fa-eye', !isPassword);
                togglePasswordIcon.classList.toggle('fa-eye-slash', isPassword);
            });
        }
    </script>
</body>
</html>
