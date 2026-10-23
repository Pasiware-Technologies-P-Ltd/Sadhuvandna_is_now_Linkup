<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login.php");
    exit;
}

$success = "";
$error = "";

if (isset($_POST['changePass'])) {

    $old = $_POST['old_password'];
    $new = $_POST['new_password'];
    $confirm = $_POST['confirm_password'];
    $id = $_SESSION['admin_id'];

    $q = mysqli_query($con, "SELECT * FROM tbl_admin WHERE admin_id='$id'");
    $row = mysqli_fetch_assoc($q);

    if (!password_verify($old, $row['password'])) {
        $error = "❌ Old Password is incorrect!";
    } elseif ($new != $confirm) {
        $error = "⚠️ New passwords do not match!";
    } else {
        $hash = password_hash($new, PASSWORD_DEFAULT);
        mysqli_query($con, "UPDATE tbl_admin SET password='$hash' WHERE admin_id='$id'");
        $success = "✅ Password updated successfully!";
    }
}
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
    <div class="premium-card overflow-hidden w-full max-w-lg">
        <div class="page-subheader">
            <div class="page-subheader-left">
                <a href="index.php" class="btn-back-nav" title="Back to Dashboard">
                    <i class="fa-solid fa-arrow-left text-xs"></i>
                </a>
                <div>
                    <h2 class="text-base font-bold text-slate-900">
                        Change Password
                    </h2>
                    <p class="text-xs text-slate-400 font-medium">Update your admin account credentials</p>
                </div>
            </div>
        </div>

        <div class="p-6 space-y-5">

        <!-- Messages -->
        <?php if ($error): ?>
            <div class="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation text-rose-600"></i>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-600"></i>
                <span><?= htmlspecialchars($success) ?></span>
            </div>
        <?php endif; ?>

        <!-- Form -->
        <form method="POST" class="space-y-4">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Old Password *</label>
                <div class="relative">
                    <i class="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input type="password" name="old_password" required placeholder="Enter current password"
                        class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">New Password *</label>
                <div class="relative">
                    <i class="fa-solid fa-key absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input type="password" name="new_password" required placeholder="Enter new strong password"
                        class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password *</label>
                <div class="relative">
                    <i class="fa-solid fa-check-double absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input type="password" name="confirm_password" required placeholder="Re-enter new password"
                        class="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>
            </div>

            <!-- Update Button -->
            <button type="submit" name="changePass" class="btn-brand-primary w-full py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2">
                <i class="fa-solid fa-shield-halved text-xs"></i>
                <span>Update Password</span>
            </button>

        </form>

        </div>
    </div>
</main>

</body>

</html>
