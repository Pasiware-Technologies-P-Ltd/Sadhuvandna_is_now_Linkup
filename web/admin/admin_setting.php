<?php
session_start();
include("../connection.php");

// Handle form submit
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['matrimony_profile_fee'])) {
		$fee_raw = trim($_POST['matrimony_profile_fee']);
		// Allow numbers and dot only
		$fee = preg_replace('/[^0-9.]/', '', $fee_raw);

		if ($fee === '') {
				$_SESSION['msg'] = "Please enter a valid fee.";
				header('Location: admin_setting');
				exit;
		}

		$key = 'matrimony_profile_fee';
		$k = mysqli_real_escape_string($con, $key);
		$v = mysqli_real_escape_string($con, $fee);

		$check = mysqli_query($con, "SELECT id FROM tbl_settings WHERE `key`='" . $k . "' LIMIT 1");
		if ($check && mysqli_num_rows($check) > 0) {
				mysqli_query($con, "UPDATE tbl_settings SET `value`='" . $v . "', updated_at=NOW() WHERE `key`='" . $k . "'");
		} else {
				mysqli_query($con, "INSERT INTO tbl_settings (`key`,`value`) VALUES ('" . $k . "','" . $v . "')");
		}

		$_SESSION['msg'] = "Matrimony profile fee updated successfully.";
		header('Location: admin_setting');
		exit;
}

// Ensure default exists and fetch current value
$key = 'matrimony_profile_fee';
$k = mysqli_real_escape_string($con, $key);
$res = mysqli_query($con, "SELECT `value` FROM tbl_settings WHERE `key`='" . $k . "' LIMIT 1");
$fee = '';
if ($res && mysqli_num_rows($res) > 0) {
		$row = mysqli_fetch_assoc($res);
		$fee = $row['value'];
} else {
		// insert default 0 if missing
		mysqli_query($con, "INSERT INTO tbl_settings (`key`,`value`) VALUES ('" . $k . "','0')");
		$fee = '0';
}
?>

<?php include("header.php"); ?>



<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

<?php if(isset($_SESSION['msg'])): ?>
<div class="mb-5 p-4 rounded-xl flex items-center justify-between border bg-emerald-50 border-emerald-200 text-emerald-800">
  <div class="flex items-center gap-3">
    <i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
    <span class="text-xs font-semibold"><?= $_SESSION['msg']; unset($_SESSION['msg']); ?></span>
  </div>
  <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
</div>
<?php endif; ?>

<div class="premium-card overflow-hidden max-w-lg mx-auto">
  <div class="page-subheader">
    <div class="page-subheader-left">
      <a href="index.php" class="btn-back-nav">
        <i class="fa-solid fa-arrow-left text-xs"></i>
      </a>
      <div>
        <h2 class="text-base font-bold text-slate-900">Global Settings</h2>
        <p class="text-xs text-slate-400 font-medium">Configure platform-level settings and fees</p>
      </div>
    </div>
  </div>

  <div class="p-6 space-y-5">
    <div>
      <h3 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <i class="fa-solid fa-indian-rupee-sign text-blue-600"></i>
        Matrimony Profile Fee
      </h3>

      <form method="post" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Fee Amount (₹)</label>
          <input name="matrimony_profile_fee" type="number" step="0.01" min="0" value="<?= htmlspecialchars($fee) ?>"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-800 font-medium transition" />
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="submit" class="btn-brand-primary text-xs font-semibold px-5 py-2.5 rounded-xl">
            <i class="fa-solid fa-check text-xs"></i>
            Save Settings
          </button>
          <a href="index.php" class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</a>
        </div>
      </form>
    </div>
  </div>
</div>

</main>


</body>
</html>

