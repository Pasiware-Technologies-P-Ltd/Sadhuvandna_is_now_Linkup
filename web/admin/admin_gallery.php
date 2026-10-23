<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

date_default_timezone_set("Asia/Kolkata");

/* ============= ADD IMAGE ===============*/
if(isset($_POST["submit_data"])){

    $title = mysqli_real_escape_string($con, $_POST["title"]);
    $date = date("Y-m-d H:i:s");

    $image_name = "";

    if(!empty($_FILES["image"]["name"])){

        $folder = "../uploads/gallery/";
        if(!is_dir($folder)){
            mkdir($folder,0777,true);
        }

        $ext = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
        $allow = ["jpg","jpeg","png","gif","webp"];

        if(in_array(strtolower($ext),$allow)){
            $newName = time().rand(1000,9999).".".$ext;
            if(move_uploaded_file($_FILES["image"]["tmp_name"], $folder.$newName)){
                $image_name = $newName;
            }
        }
    }

    if($image_name == ""){
        header("Location: admin_gallery.php?msg=".urlencode("Please upload image")."&type=error");
        exit;
    }

    mysqli_query($con,"INSERT INTO tbl_gallery (title,image,created_at) VALUES('$title','$image_name','$date')");
    header("Location: admin_gallery.php?msg=".urlencode("Image Added Successfully")."&type=success");
    exit;
}

/* ============= DELETE ===============*/
if(isset($_GET["delete"])){

    $id = intval($_GET["delete"]);
    $old = mysqli_fetch_assoc(mysqli_query($con,"SELECT image FROM tbl_gallery WHERE id='$id'"));
    if($old && $old['image']){
        $file = "../uploads/gallery/".$old['image'];
        if(file_exists($file)) unlink($file);
    }
    mysqli_query($con,"DELETE FROM tbl_gallery WHERE id='$id'");
    header("Location: admin_gallery.php?msg=".urlencode("Image Deleted")."&type=success");
    exit;
}

/* ============= FETCH ===============*/
$data = mysqli_query($con,"SELECT * FROM tbl_gallery ORDER BY id DESC");
$total_count = mysqli_num_rows($data);
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

  <?php if(isset($_GET['msg'])): 
    $is_success = (isset($_GET['type']) && $_GET['type']=='success');
  ?>
    <div class="mb-5 p-4 rounded-xl flex items-center justify-between <?= $is_success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800' ?>">
      <div class="flex items-center gap-3">
        <i class="fa-solid <?= $is_success ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600' ?> text-lg"></i>
        <span class="text-xs font-semibold"><?= htmlspecialchars($_GET['msg']) ?></span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
    </div>
  <?php endif; ?>

  <!-- Full-Width Premium Card -->
  <div class="premium-card overflow-hidden">

    <!-- Sub-Header / Action Bar -->
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="index.php" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">Gallery Management</h2>
          <p class="text-xs text-slate-400 font-medium">Upload and manage promotional and community photos</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input type="search" id="searchInput" placeholder="Search images...">
        </div>
        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Total: <span class="text-blue-600 font-bold"><?= $total_count ?></span>
        </div>
        <button type="button" onclick="openAddModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add Image</span>
        </button>
      </div>
    </div>

    <!-- Table Container (Pure 100% width with clean top header) -->
    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="galleryTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3 w-28">Preview</th>
            <th class="premium-th px-5 py-3">Title</th>
            <th class="premium-th px-5 py-3 w-40">Created Date</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white" id="galleryTableBody">
          <?php $sr = 1; while($row = mysqli_fetch_assoc($data)) { ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <?php if(!empty($row['image']) && file_exists("../uploads/gallery/".$row['image'])): ?>
                  <img src="../uploads/gallery/<?= htmlspecialchars($row['image']) ?>" 
                       class="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs hover:scale-105 transition-transform cursor-pointer"
                       onclick="previewFullImage('../uploads/gallery/<?= htmlspecialchars($row['image']) ?>')"
                       alt="Thumbnail">
                <?php else: ?>
                  <div class="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <i class="fa-solid fa-image text-lg"></i>
                  </div>
                <?php endif; ?>
              </td>

              <td class="px-5 py-3.5">
                <span class="font-bold text-slate-800 text-sm block"><?= htmlspecialchars($row['title']) ?></span>
                <span class="text-[11px] text-slate-400 font-medium">ID: #<?= $row['id'] ?></span>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y, h:i A", strtotime($row['created_at'])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <a href="admin_gallery_edit.php?id=<?= $row['id'] ?>" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </a>
                  <a href="?delete=<?= $row['id'] ?>" 
                    onclick="return confirm('Delete this image permanently?')" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php } ?>

          <?php if($total_count == 0): ?>
            <tr>
              <td colspan="5" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-regular fa-image"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No gallery images found</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add Image" above to upload the first photo</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Gallery -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="galleryCards">
      <?php 
      if($total_count > 0):
        mysqli_data_seek($data, 0);
        while($row = mysqli_fetch_assoc($data)):
          $img_path = (!empty($row['image']) && file_exists("../uploads/gallery/".$row['image'])) ? "../uploads/gallery/".htmlspecialchars($row['image']) : null;
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs gallery-card transition hover:shadow-xs">
        <div class="flex items-center justify-between gap-3 mb-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <?php if($img_path): ?>
              <img src="<?= $img_path ?>" onclick="previewFullImage('<?= $img_path ?>')" 
                   class="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs flex-shrink-0 cursor-pointer" alt="Thumbnail">
            <?php else: ?>
              <div class="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                <i class="fa-regular fa-image text-lg"></i>
              </div>
            <?php endif; ?>

            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug truncate"><?= htmlspecialchars($row['title']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium mt-0.5">ID: #<?= $row['id'] ?></p>
              <p class="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                <i class="fa-regular fa-calendar text-[9px] text-slate-400"></i> <?= date("d M Y", strtotime($row['created_at'])) ?>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <a href="admin_gallery_edit.php?id=<?= $row['id'] ?>" title="Edit"
              class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-pen text-[11px]"></i>
            </a>
            <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this image permanently?')" title="Delete"
              class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </a>
          </div>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No gallery images found</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD GALLERY IMAGE ================= -->
<div id="addModal" class="admin-modal-overlay">
  <div class="admin-modal-card">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-image"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Add Gallery Image</h3>
          <p class="text-[11px] text-slate-400">Upload a new promotional or event photo</p>
        </div>
      </div>
      <button type="button" onclick="closeAddModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" enctype="multipart/form-data" class="flex flex-col flex-1 overflow-hidden">
      <div class="admin-modal-body space-y-4">
        
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Image Title</label>
          <input type="text" name="title" required placeholder="Enter image title or occasion"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select Image</label>
          
          <div id="imageDropzone" class="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/20 transition cursor-pointer relative bg-slate-50/50">
            <input type="file" name="image" id="modalImageInput" accept="image/*" required class="absolute inset-0 opacity-0 cursor-pointer" onchange="handleModalImagePreview(event)">
            <div id="dropzoneContent">
              <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 mb-2"></i>
              <p class="text-xs font-semibold text-slate-700">Click to upload or drag & drop</p>
              <p class="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Max 10MB)</p>
            </div>
            <img id="imagePreview" class="hidden max-h-36 mx-auto rounded-lg object-contain shadow-xs">
          </div>
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeAddModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_data" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-upload text-xs"></i>
          <span>Upload Image</span>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Lightbox Modal for Photo Preview -->
<div id="lightboxModal" class="admin-modal-overlay" onclick="closeLightbox()">
  <div class="relative max-w-3xl max-h-[90vh] p-2" onclick="event.stopPropagation()">
    <img id="lightboxImg" src="" class="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-slate-800">
    <button onclick="closeLightbox()" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition">
      <i class="fa-solid fa-xmark text-sm"></i>
    </button>
  </div>
</div>

</body>
<script>
function openAddModal() {
  document.getElementById('addModal').classList.add('active');
}
function closeAddModal() {
  document.getElementById('addModal').classList.remove('active');
}

function handleModalImagePreview(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      document.getElementById('imagePreview').src = evt.target.result;
      document.getElementById('imagePreview').classList.remove('hidden');
      document.getElementById('dropzoneContent').classList.add('hidden');
    }
    reader.readAsDataURL(file);
  }
}

function previewFullImage(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxModal').classList.add('active');
}
function closeLightbox() {
  document.getElementById('lightboxModal').classList.remove('active');
}

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#galleryTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#galleryCards .gallery-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>
