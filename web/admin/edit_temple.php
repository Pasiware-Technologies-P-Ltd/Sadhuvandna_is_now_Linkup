<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {

    // Check If Cookie Exists
    if (isset($_COOKIE['sadhu_admin_id']) && isset($_COOKIE['sadhu_admin_token'])) {

        $id = $_COOKIE['sadhu_admin_id'];
        $token = $_COOKIE['sadhu_admin_token'];

        $q = mysqli_query($con, "SELECT * FROM tbl_admin WHERE admin_id='$id' LIMIT 1");

        if (mysqli_num_rows($q) == 1) {
            $row = mysqli_fetch_assoc($q);

            // Verify Cookie Token
            if (sha1($row['password']) === $token) {

                // Auto-Login using Cookie
                $_SESSION['admin_id'] = $row['admin_id'];
                $_SESSION['admin_name'] = $row['username'];

            }
        }
    }
}

// Still not logged in → redirect to login
if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

date_default_timezone_set("Asia/Kolkata");

// ---------------- Fetch Temple ----------------
if (!isset($_GET['id'])) {
    die("Invalid Request");
}

$id = intval($_GET['id']);
$data = mysqli_fetch_assoc(mysqli_query($con, "SELECT * FROM tbl_temple WHERE temple_id=$id"));

if (!$data) {
    die("Temple Not Found!");
}

// ---------------- Update Temple ----------------
if (isset($_POST['updateTemple'])) {

    $mahant_name = $_POST['mahant_name'];
    $mobile = $_POST['mobile'];
    $village = $_POST['village'];
    $taluka = $_POST['taluka'];
    $district = $_POST['district'];

    $final_photo = $data['photo'];

    // If new image uploaded
    if (!empty($_FILES['photo']['name'])) {

        $imgName = time() . "_" . $_FILES['photo']['name'];
        $target = "../uploads/temple/" . $imgName;

        move_uploaded_file($_FILES['photo']['tmp_name'], $target);

        // Delete old image
        if ($data['photo'] != "" && file_exists("../uploads/temple/" . $data['photo'])) {
            unlink("../uploads/temple/" . $data['photo']);
        }

        $final_photo = $imgName;
    }

    // Update Query
    mysqli_query($con, 
        "UPDATE tbl_temple SET 
            mahant_name='$mahant_name',
            mobile='$mobile',
            village='$village',
            taluka='$taluka',
            district='$district',
            photo='$final_photo'
         WHERE temple_id=$id"
    );

    echo "<script>alert('Temple Updated Successfully'); window.location='create_temple.php';</script>";
}
?>

<?php include("header.php"); ?>



<!-- Main -->
<!-- Main -->
<main class="w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
 <div class="premium-card overflow-hidden w-full max-w-xl">
    
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="create_temple.php" class="btn-back-nav" title="Back to Temples">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">
            Edit Temple
          </h2>
          <p class="text-xs text-slate-400 font-medium">Update temple location and mahant details</p>
        </div>
      </div>
    </div>

    <div class="p-6">
        <form method="POST" enctype="multipart/form-data" class="space-y-4">

            <!-- Image -->
            <div class="flex flex-col items-center pb-2">
                <div class="w-24 h-24 bg-slate-50 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center relative shadow-2xs">
                    <img id="previewImg" 
                         src="../uploads/temple/<?= $data['photo'] ?>" 
                         class="w-full h-full object-cover <?= $data['photo'] ? '' : 'hidden' ?>">
                    
                    <?php if (!$data['photo']): ?>
                        <i id="defaultIcon" class="fa-solid fa-place-of-worship text-slate-300 text-3xl"></i>
                    <?php endif; ?>
                </div>

                <input type="file" name="photo" id="photo" class="hidden" accept="image/*" onchange="showPreview(event)">
                <label for="photo" class="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold cursor-pointer mt-2.5 transition">
                    <i class="fa-solid fa-camera text-xs mr-1"></i> Change Photo
                </label>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mahant Name *</label>
                    <input type="text" name="mahant_name" value="<?= htmlspecialchars($data['mahant_name']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mobile *</label>
                    <input type="text" name="mobile" value="<?= htmlspecialchars($data['mobile']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Village *</label>
                    <input type="text" name="village" value="<?= htmlspecialchars($data['village']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Taluka *</label>
                    <input type="text" name="taluka" value="<?= htmlspecialchars($data['taluka']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">District *</label>
                    <input type="text" name="district" value="<?= htmlspecialchars($data['district']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
                </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-3">
                <button type="submit" name="updateTemple" class="btn-brand-primary flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-check text-xs"></i> <span>Update Temple</span>
                </button>

                <a href="create_temple.php" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition">
                    <i class="fa-solid fa-xmark text-xs"></i> <span>Cancel</span>
                </a>
            </div>

        </form>
    </div>
 </div>
</main>

<script>
function showPreview(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById("previewImg").src = URL.createObjectURL(file);
    document.getElementById("previewImg").classList.remove("hidden");

    const icon = document.getElementById("defaultIcon");
    if (icon) icon.classList.add("hidden");
}
</script>

</body>
</html>
