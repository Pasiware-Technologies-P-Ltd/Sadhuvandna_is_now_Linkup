<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login.php");
    exit;
}

date_default_timezone_set("Asia/Kolkata");

/* ============= ADD IMAGE ===============*/
if(isset($_POST["submit_data"])){

    $title = mysqli_real_escape_string($con, $_POST["title"]);
    $date = date("Y-m-d H:i:s");

    $image_name = "";

    if(!empty($_FILES["image"]["name"])){

        $folder = "../uploads/festival_frames/";
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
        header("Location: admin_festival_frames.php?msg=".urlencode("Please upload image")."&type=error");
        exit;
    }

    mysqli_query($con,"INSERT INTO tbl_festival_frames (title,frame_image,created_at) VALUES('$title','$image_name','$date')");
    header("Location: admin_festival_frames.php?msg=".urlencode("Frame Added Successfully")."&type=success");
    exit;
}

/* ============= DELETE ===============*/
if(isset($_GET["delete"])){

    $id = intval($_GET["delete"]);
    $old = mysqli_fetch_assoc(mysqli_query($con,"SELECT frame_image FROM tbl_festival_frames WHERE id='$id'"));
    if($old && $old['frame_image']){
        $file = "../uploads/festival_frames/".$old['frame_image'];
        if(file_exists($file)) unlink($file);
    }
    mysqli_query($con,"DELETE FROM tbl_festival_frames WHERE id='$id'");
    header("Location: admin_festival_frames.php?msg=".urlencode("Frame Deleted")."&type=success");
    exit;
}

/* ============= FETCH ===============*/
$data = mysqli_query($con,"SELECT * FROM tbl_festival_frames ORDER BY id DESC");
$total_count = mysqli_num_rows($data);
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

  <?php if(isset($_GET['msg'])): 
    $is_success = (isset($_GET['type']) && $_GET['type']=='success');
  ?>
    <div class="mb-5 p-4 rounded-xl flex items-center justify-between border <?= $is_success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800' ?>">
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
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            Festival Frames Management
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage personalized festive photo frames and community templates</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" id="searchInput" placeholder="Search frames...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Frames: <span class="text-blue-600 font-bold"><?= $total_count ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add Frame</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="framesTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3 w-28">Frame Preview</th>
            <th class="premium-th px-5 py-3">Title & Occasion</th>
            <th class="premium-th px-5 py-3 w-40">Created Date</th>
            <th class="premium-th px-5 py-3 text-center w-24">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="framesTableBody">
          <?php $sr = 1; while($row = mysqli_fetch_assoc($data)) { ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <?php if(!empty($row['frame_image']) && file_exists("../uploads/festival_frames/".$row['frame_image'])): ?>
                  <div class="w-14 h-14 rounded-xl p-1 bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center cursor-pointer hover:scale-105 transition"
                       onclick="previewFullImage('../uploads/festival_frames/<?= htmlspecialchars($row['frame_image']) ?>')">
                    <img src="../uploads/festival_frames/<?= htmlspecialchars($row['frame_image']) ?>" 
                         class="max-w-full max-h-full object-contain"
                         alt="Frame Preview">
                  </div>
                <?php else: ?>
                  <div class="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
                  </div>
                <?php endif; ?>
              </td>

              <td class="px-5 py-3.5">
                <span class="font-bold text-slate-900 text-sm block"><?= htmlspecialchars($row['title']) ?></span>
                <span class="text-[11px] text-slate-400 font-medium">ID: #<?= $row['id'] ?></span>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y", strtotime($row['created_at'])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <a href="?delete=<?= $row['id'] ?>"
                  onclick="return confirm('Delete this festival frame?')" title="Delete"
                  class="w-8 h-8 mx-auto rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                  <i class="fa-solid fa-trash text-xs"></i>
                </a>
              </td>
            </tr>
          <?php } ?>

          <?php if($total_count == 0): ?>
            <tr>
              <td colspan="5" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No festival frames added yet</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add Frame" to upload transparent PNG frames</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Festival Frames -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="frameCards">
      <?php 
      if($total_count > 0):
        mysqli_data_seek($data, 0);
        while($row = mysqli_fetch_assoc($data)):
          $img_path = (!empty($row['frame_image']) && file_exists("../uploads/festival_frames/".$row['frame_image'])) ? "../uploads/festival_frames/".htmlspecialchars($row['frame_image']) : null;
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs frame-card transition hover:shadow-xs">
        <div class="flex items-center justify-between gap-3 mb-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <?php if($img_path): ?>
              <div class="w-14 h-14 rounded-xl p-1 bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center flex-shrink-0 cursor-pointer"
                   onclick="previewFullImage('<?= $img_path ?>')">
                <img src="<?= $img_path ?>" class="max-w-full max-h-full object-contain" alt="Frame">
              </div>
            <?php else: ?>
              <div class="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                <i class="fa-solid fa-wand-magic-sparkles text-sm text-slate-400"></i>
              </div>
            <?php endif; ?>

            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug truncate"><?= htmlspecialchars($row['title']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium">ID: #<?= $row['id'] ?></p>
              <p class="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                <i class="fa-regular fa-calendar text-[9px] text-slate-400"></i> <?= date("d M Y", strtotime($row['created_at'])) ?>
              </p>
            </div>
          </div>

          <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this festival frame?')" title="Delete"
            class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs flex-shrink-0">
            <i class="fa-solid fa-trash text-[11px]"></i>
          </a>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No festival frames added yet</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD FESTIVAL FRAME ================= -->
<div id="addModal" class="admin-modal-overlay">
  <div class="admin-modal-card">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Add Festival Frame</h3>
          <p class="text-[11px] text-slate-400">Upload new festive frame PNG for community members</p>
        </div>
      </div>
      <button type="button" onclick="closeAddModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" enctype="multipart/form-data" class="flex flex-col flex-1 overflow-hidden">
      <div class="admin-modal-body space-y-4">
        
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Frame Title / Occasion</label>
          <input type="text" name="title" required placeholder="e.g. Diwali Frame 2026, Holi Special"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Upload Frame PNG</label>
          
          <div class="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/20 transition cursor-pointer relative bg-slate-50/50">
            <input type="file" name="image" id="modalFrameInput" accept="image/*" required class="absolute inset-0 opacity-0 cursor-pointer" onchange="handleFramePreview(event)">
            <div id="dropzoneContent">
              <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 mb-2"></i>
              <p class="text-xs font-semibold text-slate-700">Click to upload or drag & drop</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Recommended: PNG with transparency (1080x1080)</p>
            </div>
            <img id="framePreview" class="hidden max-h-36 mx-auto rounded-lg object-contain shadow-xs">
          </div>
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeAddModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_data" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i>
          <span>Save Frame</span>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Image Lightbox Modal -->
<div id="lightboxModal" class="admin-modal-overlay" onclick="closeLightbox()">
  <div class="relative max-w-3xl max-h-[90vh] p-2" onclick="event.stopPropagation()">
    <img id="lightboxImg" src="" class="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-slate-800 bg-slate-900/60 p-4">
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

function handleFramePreview(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      document.getElementById('framePreview').src = evt.target.result;
      document.getElementById('framePreview').classList.remove('hidden');
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
  document.querySelectorAll("#framesTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#frameCards .frame-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



