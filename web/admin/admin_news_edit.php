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

// ------------ Fetch News Using ID -------------
if (!isset($_GET['id'])) {
    die("Invalid Request");
}
$id = intval($_GET['id']);

$query = mysqli_query($con, "SELECT * FROM tbl_news WHERE id='$id'");
$data = mysqli_fetch_assoc($query);

if (!$data) {
    die("News not found");
}

// ------------ Update News ---------------------
if (isset($_POST['update'])) {

    date_default_timezone_set("Asia/Kolkata");

    $title = mysqli_real_escape_string($con, $_POST['title']);
    $description = mysqli_real_escape_string($con, $_POST['description']);
    $date = $_POST['date'];

    $old_images = $data['image']; // comma separated
    $final_images = $old_images;

    // ---- If New Images Selected ----
    if (!empty($_FILES['images']['name'][0])) {

        // Delete Old Images
        if (!empty($old_images)) {
            $imgs = explode(",", $old_images);
            foreach ($imgs as $img) {
                $path = "../uploads/news/" . $img;
                if (file_exists($path)) unlink($path);
            }
        }

        $new_images = [];
        $upload_path = "../uploads/news/";

        foreach ($_FILES['images']['name'] as $key => $name) {
            $tmp = $_FILES['images']['tmp_name'][$key];
            $new_name = time() . "_" . rand(1000,9999) . "_" . basename($name);

            if (move_uploaded_file($tmp, $upload_path . $new_name)) {
                $new_images[] = $new_name;
            }
        }

        $final_images = implode(",", $new_images);
    }

    // ---- Update Query ----
    $update = mysqli_query($con,
        "UPDATE tbl_news SET 
            title='$title',
            description='$description',
            created_at='$date',
            image='$final_images'
        WHERE id='$id'"
    );

    if ($update) {
        echo "<script>
                alert('News Updated Successfully!');
                window.location='add_views_news.php';
              </script>";
    } else {
        echo "<script>alert('Error while updating news');</script>";
    }
}
?>

<?php include("header.php"); ?>
  


<main class="w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-center">
 <div class="premium-card overflow-hidden w-full max-w-3xl">
    
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="add_views_news.php" class="btn-back-nav" title="Back to News">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">
            Edit News &amp; Article
          </h2>
          <p class="text-xs text-slate-400 font-medium">Update publication story and attached images</p>
        </div>
      </div>
    </div>

    <div class="p-6">
       <form method="POST" enctype="multipart/form-data" class="space-y-4">

        <!-- Existing Images -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Current Images</label>

          <div class="flex flex-wrap gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <?php
            if (!empty($data['image'])) {
                $imgs = explode(",", $data['image']);
                foreach ($imgs as $img) {
                    echo "<img src='../uploads/news/$img' class='w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-2xs'>";
                }
            } else {
                echo "<span class='text-xs text-slate-400 font-medium'>No images attached</span>";
            }
            ?>
          </div>
        </div>

        <!-- Upload New Images -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Replace Images</label>

          <input type="file" name="images[]" multiple accept="image/*"
            onchange="showPreview(event)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"/>
          <p class="text-[11px] text-slate-400 mt-1">Leave empty to keep current images</p>

          <div id="newPreview" class="flex flex-wrap gap-2.5 mt-3"></div>
        </div>

        <!-- Title -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">News Title *</label>
          <input type="text" name="title" required
            value="<?= htmlspecialchars($data['title']) ?>"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition"/>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description *</label>
          <textarea name="description" required rows="5"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition resize-none"><?= htmlspecialchars($data['description']) ?></textarea>
        </div>

        <!-- Date -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Publish Date *</label>
          <input type="date" name="date" required
            value="<?= date('Y-m-d', strtotime($data['created_at'])) ?>"
            class="w-full sm:w-60 px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition"/>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 pt-3">
          <button type="submit" name="update"
            class="btn-brand-primary flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer">
            <i class="fa-solid fa-check text-xs"></i> <span>Update News</span>
          </button>

          <a href="add_views_news.php"
            class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition">
            <i class="fa-solid fa-xmark text-xs"></i> <span>Cancel</span>
          </a>
        </div>

       </form>
    </div>
  </div>
</main>

<script>
function showPreview(event){
  const box = document.getElementById("newPreview");
  box.innerHTML = "";

  Array.from(event.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(){
      const img = document.createElement("img");
      img.src = reader.result;
      img.className = "w-20 h-20 object-cover rounded-lg border";
      box.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}
</script>

</body>
</html>
