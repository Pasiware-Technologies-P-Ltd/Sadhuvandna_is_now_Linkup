<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

// ---- Fetch Record ----
if (!isset($_GET['id'])) {
    die("Invalid Request");
}
$id = intval($_GET['id']);

$q = mysqli_query($con, "SELECT * FROM tbl_gallery WHERE id='$id' LIMIT 1");
$data = mysqli_fetch_assoc($q);

if (!$data) {
    die("Record not found");
}

// ---- UPDATE ----
if (isset($_POST['update'])) {

    $title = mysqli_real_escape_string($con, $_POST['title']);

    // image update
    $image_name = $data['image']; // old image

    if (!empty($_FILES['image']['name'])) {

        $folder = "../uploads/gallery/";
        if (!is_dir($folder)) mkdir($folder, 0777, true);

        $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $allow = ["jpg","jpeg","png","gif","webp"];

        if (in_array(strtolower($ext), $allow)) {

            $newName = "G_".time().rand(1000,9999).".".$ext;

            if (move_uploaded_file($_FILES['image']['tmp_name'], $folder.$newName)) {

                // delete old
                if ($image_name && file_exists($folder.$image_name)) unlink($folder.$image_name);

                $image_name = $newName;
            }
        }
    }

    mysqli_query($con,
        "UPDATE tbl_gallery SET 
            title='$title',
            image='$image_name'
        WHERE id='$id'"
    );

    header("Location: admin_gallery.php?msg=".urlencode("Updated Successfully")."&type=success");
    exit;
}
?>

<?php include("header.php"); ?>

<!-- MAIN -->
<main class="w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
 <div class="premium-card overflow-hidden w-full max-w-xl">
    
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="admin_gallery.php" class="btn-back-nav" title="Back to Gallery">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">
            Edit Gallery Image
          </h2>
          <p class="text-xs text-slate-400 font-medium">Update title and image asset</p>
        </div>
      </div>
    </div>

    <div class="p-6">
       <form method="POST" enctype="multipart/form-data" class="space-y-4">

      <!-- Title -->
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title *</label>
        <input type="text" name="title"
         value="<?= htmlspecialchars($data['title']) ?>"
         required
         class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
      </div>

      <!-- OLD IMAGE -->
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Current Image</label>
        <div class="inline-block relative">
          <img src="../uploads/gallery/<?= $data['image'] ?>"
           class="w-48 h-36 object-cover rounded-xl border border-slate-200 shadow-2xs">
        </div>
      </div>

      <!-- New -->
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Replace Image</label>
        <input type="file" name="image" accept="image/*"
         class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer">
        <p class="text-[11px] text-slate-400 mt-1">Leave blank to keep old image</p>
      </div>

      <!-- Buttons -->
      <div class="flex gap-3 pt-3">
        <button type="submit" name="update"
          class="btn-brand-primary flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i> <span>Update Image</span>
        </button>

        <a href="admin_gallery.php"
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
