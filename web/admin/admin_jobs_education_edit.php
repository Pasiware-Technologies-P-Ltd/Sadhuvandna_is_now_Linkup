<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

// ------------ Fetch Data Using ID -------------
if (!isset($_GET['id'])) {
    die("Invalid Request");
}
$id = intval($_GET['id']);

$query = mysqli_query($con, "SELECT * FROM tbl_jobs_education WHERE id='$id'");
$data = mysqli_fetch_assoc($query);

if (!$data) {
    die("Record not found");
}

// ------------ Update Data ---------------------
if (isset($_POST['update'])) {

    date_default_timezone_set("Asia/Kolkata");

    $type = mysqli_real_escape_string($con, $_POST['type']);
    $title = mysqli_real_escape_string($con, $_POST['title']);
    $description = mysqli_real_escape_string($con, $_POST['description']);

    $image_name = $data['image']; // default old

    // ========= IMAGE UPLOAD =========
    if (!empty($_FILES["image"]["name"])) {

        $folder = "../uploads/jobs/";
        if(!is_dir($folder)) mkdir($folder,0777,true);

        $ext = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
        $allow = ["jpg","jpeg","png","gif","webp"];

        if(in_array(strtolower($ext),$allow)){

            // delete old image
            if($image_name!="" && file_exists("../uploads/jobs/".$image_name)){
                unlink("../uploads/jobs/".$image_name);
            }

            $newName = time().rand(1000,9999).".".$ext;
            move_uploaded_file($_FILES["image"]["tmp_name"], $folder.$newName);
            $image_name = $newName;
        }
    }

    $update = mysqli_query($con,
        "UPDATE tbl_jobs_education SET 
            type='$type',
            title='$title',
            description='$description',
            image='$image_name'
        WHERE id='$id'"
    );

    if ($update) {
        echo "<script>alert('Updated Successfully!');window.location='admin_jobs_education.php';</script>";
    } else {
        echo "<script>alert('Error while updating data');</script>";
    }
}
?>


<?php include("header.php"); ?>

<!-- MAIN -->
<main class="w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
 <div class="premium-card overflow-hidden w-full max-w-2xl">
    
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="admin_jobs_education.php" class="btn-back-nav" title="Back to List">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">
            Edit Job / Education
          </h2>
          <p class="text-xs text-slate-400 font-medium">Update opportunity details and banner</p>
        </div>
      </div>
    </div>

    <div class="p-6">
       <form method="POST" enctype="multipart/form-data" class="space-y-4">

        <!-- TYPE -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Type *</label>
          <select name="type" required
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition cursor-pointer">
            <option value="job" <?= $data['type']=='job' ? 'selected' : '' ?>>Job</option>
            <option value="education" <?= $data['type']=='education' ? 'selected' : '' ?>>Education</option>
          </select>
        </div>

        <!-- TITLE -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title *</label>
          <input type="text" name="title" required
            value="<?= htmlspecialchars($data['title']) ?>"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>

        <!-- DESCRIPTION -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description *</label>
          <textarea name="description" rows="5" required
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition resize-none"><?= htmlspecialchars($data['description']) ?></textarea>
        </div>

        <!-- IMAGE -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Banner Image</label>

          <?php if($data['image']!=""): ?>
            <div class="mb-2 inline-block relative">
              <img src="../uploads/jobs/<?= $data['image'] ?>" class="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-2xs">
            </div>
          <?php endif; ?>

          <input type="file" name="image" accept="image/*"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer">
          <p class="text-[11px] text-slate-400 mt-1">Leave empty to keep previous image</p>
        </div>

        <!-- BUTTONS -->
        <div class="flex gap-3 pt-3">
          <button type="submit" name="update"
            class="btn-brand-primary flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer">
            <i class="fa-solid fa-check text-xs"></i> <span>Update Opportunity</span>
          </button>

          <a href="admin_jobs_education.php"
            class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition">
            <i class="fa-solid fa-xmark text-xs"></i> <span>Cancel</span>
          </a>
        </div>

      </form>
    </div>
  </div>
</main>

</body>
</html>
