<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    if (isset($_COOKIE['sadhu_admin_id']) && isset($_COOKIE['sadhu_admin_token'])) {
        $id = $_COOKIE['sadhu_admin_id'];
        $token = $_COOKIE['sadhu_admin_token'];
        $q = mysqli_query($con, "SELECT * FROM tbl_admin WHERE admin_id='$id' LIMIT 1");
        if (mysqli_num_rows($q) == 1) {
            $row = mysqli_fetch_assoc($q);
            if (sha1($row['password']) === $token) {
                $_SESSION['admin_id'] = $row['admin_id'];
                $_SESSION['admin_name'] = $row['username'];
            }
        }
    }
}

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

date_default_timezone_set("Asia/Kolkata");

// ---------------- FETCH BRANCH ------------------
if (!isset($_GET['id'])) {
    die("Invalid Request!");
}
$id = intval($_GET['id']);
$q = mysqli_query($con, "SELECT * FROM tbl_branch WHERE id='$id'");
$data = mysqli_fetch_assoc($q);
if (!$data) die("Branch Not Found!");

$errors = [];

// ---------------- UPDATE BRANCH -------------------
if (isset($_POST['update'])) {
    $village = trim($_POST['village']);
    $branch_name = trim($_POST['branch_name']);
    $mahant_name = trim($_POST['mahant_name']);
    $mahant_mobile = trim($_POST['mahant_mobile']);
    $details = trim($_POST['details']);

    if ($village=="" || $branch_name=="" || $mahant_name=="" || $mahant_mobile=="" || $details=="") {
        $errors[] = "All fields are required.";
    }

    $final_image = $data['photo'];

    if (!empty($_FILES['photo']['name'])) {
        $allowed = ['image/jpeg','image/jpg','image/png'];
        $file_type = $_FILES['photo']['type'];
        $file_tmp = $_FILES['photo']['tmp_name'];
        $file_size = $_FILES['photo']['size'];
        $orig_name = basename($_FILES['photo']['name']);

        if (!in_array($file_type,$allowed)) $errors[]="Only JPG, JPEG, PNG allowed.";
        elseif ($file_size>2*1024*1024) $errors[]="Image must be less than 2MB.";
        else {
            $new_name = time().'_'.preg_replace('/[^A-Za-z0-9_\-\.]/','_',$orig_name);
            $upload_dir = "../uploads/branches/";
            if(!is_dir($upload_dir)) mkdir($upload_dir,0777,true);
            if(move_uploaded_file($file_tmp,$upload_dir.$new_name)){
                if($data['photo']!="" && file_exists($upload_dir.$data['photo'])) unlink($upload_dir.$data['photo']);
                $final_image=$new_name;
            }
        }
    }

    if(empty($errors)){
        $sql="UPDATE tbl_branch SET 
              branch_village='".mysqli_real_escape_string($con,$village)."',
              branch_name='".mysqli_real_escape_string($con,$branch_name)."',
              mahant_name='".mysqli_real_escape_string($con,$mahant_name)."',
              mahant_mobile='".mysqli_real_escape_string($con,$mahant_mobile)."',
              details='".mysqli_real_escape_string($con,$details)."',
              photo='$final_image'
              WHERE id='$id'";

        if(mysqli_query($con,$sql)){
            echo "<script>alert('Branch Updated Successfully!');window.location='create_branch.php';</script>";
            exit;
        } else {
            $errors[]="Database Error! ".mysqli_error($con);
        }
    }
}
?>

<?php include("header.php"); ?>



<main class="w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
 <div class="premium-card overflow-hidden w-full max-w-xl">
    
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="create_branch.php" class="btn-back-nav" title="Back to Branches">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">
            Edit Branch
          </h2>
          <p class="text-xs text-slate-400 font-medium">Update community branch and mahant details</p>
        </div>
      </div>
    </div>

    <div class="p-6">
        <?php if(!empty($errors)): ?>
            <div class="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold mb-4">
                <ul class="list-disc list-inside space-y-1">
                    <?php foreach($errors as $e) echo "<li>".htmlspecialchars($e)."</li>"; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" class="space-y-4">

            <!-- Image -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mahant Photo</label>
                <div class="flex items-center gap-4">
                    <img id="preview" src="../uploads/branches/<?= $data['photo'] ?>" class="w-16 h-16 object-cover rounded-full border border-slate-200 shadow-2xs flex-shrink-0">
                    <input type="file" name="photo" accept="image/*" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" onchange="previewImage(this)">
                </div>
            </div>

            <!-- Branch Village -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch Village *</label>
                <input type="text" name="village" value="<?= htmlspecialchars($data['branch_village']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
            </div>

            <!-- Branch Name -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch Name *</label>
                <input type="text" name="branch_name" value="<?= htmlspecialchars($data['branch_name']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
            </div>

            <!-- Mahant Name -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mahant Name *</label>
                <input type="text" name="mahant_name" value="<?= htmlspecialchars($data['mahant_name']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
            </div>

            <!-- Mahant Mobile -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mahant Mobile *</label>
                <input type="text" name="mahant_mobile" value="<?= htmlspecialchars($data['mahant_mobile']) ?>" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
            </div>

            <!-- Details -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch History / Details *</label>
                <textarea name="details" rows="4" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition resize-none"><?= htmlspecialchars($data['details']) ?></textarea>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-3">
                <button type="submit" name="update" class="btn-brand-primary flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-check text-xs"></i> <span>Update Branch</span>
                </button>
                <a href="create_branch.php" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition">
                    <i class="fa-solid fa-xmark text-xs"></i> <span>Cancel</span>
                </a>
            </div>

        </form>
    </div>
 </div>
</main>

</body>
</html>
