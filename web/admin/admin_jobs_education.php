<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

date_default_timezone_set("Asia/Kolkata");

/* ============= ADD DATA ===============*/
if(isset($_POST["submit_data"])){

    $type = mysqli_real_escape_string($con, $_POST["type"]);
    $title = mysqli_real_escape_string($con, $_POST["title"]);
    $description = mysqli_real_escape_string($con, $_POST["description"]);
    $date = date("Y-m-d H:i:s");

    /* IMAGE UPLOAD */
    $image_name = "";
    if(!empty($_FILES["image"]["name"])){

        $folder = "../uploads/jobs/";
        if(!is_dir($folder)){
            mkdir($folder,0777,true);
        }

        $ext = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
        $allow = ["jpg","jpeg","png","gif","webp"];

        if(in_array(strtolower($ext),$allow)){
            $newName = time().rand(1000,9999).".".$ext;
            move_uploaded_file($_FILES["image"]["tmp_name"], $folder.$newName);
            $image_name = $newName;
        }
    }

    $sql = "INSERT INTO tbl_jobs_education (type, title, description, image, created_at)
            VALUES ('$type', '$title', '$description', '$image_name', '$date')";

    if(mysqli_query($con, $sql)){
        header("Location: admin_jobs_education.php?msg=".urlencode("Added Successfully")."&type=success");
    }else{
        header("Location: admin_jobs_education.php?msg=".urlencode("Error adding item")."&type=error");
    }
    exit;
}

/* ============= DELETE ================*/
if(isset($_GET["delete"])){

    $del_id = intval($_GET["delete"]);
    
    // old image delete
    $old = mysqli_fetch_assoc(mysqli_query($con,"SELECT image FROM tbl_jobs_education WHERE id='$del_id'"));
    if($old && $old['image']!=""){
        $file = "../uploads/jobs/".$old['image'];
        if(file_exists($file)) unlink($file);
    }

    mysqli_query($con,"DELETE FROM tbl_jobs_education WHERE id='$del_id'");
    header("Location: admin_jobs_education.php?msg=".urlencode("Deleted Successfully")."&type=success");
    exit;
}

/* ============= FETCH ================*/
$data = mysqli_query($con, "SELECT * FROM tbl_jobs_education ORDER BY id DESC");
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
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            Jobs & Education
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage employment opportunities and educational resources</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" id="searchInput" placeholder="Search jobs & education...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Total: <span class="text-blue-600 font-bold"><?= $total_count ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add Opportunity</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="jobsTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3 w-28">Type</th>
            <th class="premium-th px-5 py-3 w-24">Thumbnail</th>
            <th class="premium-th px-5 py-3">Title</th>
            <th class="premium-th px-5 py-3 w-1/3">Description</th>
            <th class="premium-th px-5 py-3 w-36">Posted Date</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="jobsTableBody">
          <?php $sr = 1; while($row = mysqli_fetch_assoc($data)) { 
            $is_job = (strtolower($row['type']) === 'job');
          ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold <?= $is_job ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200' ?>">
                  <i class="fa-solid <?= $is_job ? 'fa-briefcase text-[10px]' : 'fa-graduation-cap text-[10px]' ?>"></i>
                  <?= htmlspecialchars(ucfirst($row['type'])) ?>
                </span>
              </td>

              <td class="px-5 py-3.5">
                <?php if(!empty($row['image']) && file_exists("../uploads/jobs/".$row['image'])): ?>
                  <img src="../uploads/jobs/<?= htmlspecialchars($row['image']) ?>" 
                       class="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs hover:scale-105 transition cursor-pointer"
                       onclick="previewFullImage('../uploads/jobs/<?= htmlspecialchars($row['image']) ?>')"
                       alt="Thumbnail">
                <?php else: ?>
                  <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <i class="fa-solid fa-image text-sm"></i>
                  </div>
                <?php endif; ?>
              </td>

              <td class="px-5 py-3.5">
                <span class="font-bold text-slate-900 text-sm block"><?= htmlspecialchars($row['title']) ?></span>
                <span class="text-[11px] text-slate-400 font-medium">ID: #<?= $row['id'] ?></span>
              </td>

              <td class="px-5 py-3.5">
                <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed" id="desc-<?= $row['id'] ?>">
                  <?= htmlspecialchars($row['description']) ?>
                </p>
                <button type="button" onclick="toggleDescription('desc-<?= $row['id'] ?>', this)"
                  class="text-blue-600 text-[11px] font-semibold hover:underline mt-1 block">
                  Read more
                </button>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y", strtotime($row['created_at'])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <a href="admin_jobs_education_edit.php?id=<?= $row['id'] ?>" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </a>
                  <a href="?delete=<?= $row['id'] ?>"
                    onclick="return confirm('Delete this record?')" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php } ?>

          <?php if($total_count == 0): ?>
            <tr>
              <td colspan="7" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-briefcase"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No jobs or educational resources found</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add Opportunity" to publish new postings</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Jobs & Education -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="jobsCards">
      <?php 
      if($total_count > 0):
        mysqli_data_seek($data, 0);
        while($row = mysqli_fetch_assoc($data)):
          $is_job = (strtolower($row['type']) === 'job');
          $img_path = (!empty($row['image']) && file_exists("../uploads/jobs/".$row['image'])) ? "../uploads/jobs/".htmlspecialchars($row['image']) : null;
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs job-card transition hover:shadow-xs">
        <div class="flex items-start justify-between gap-2.5 mb-2.5">
          <div class="flex items-start gap-2.5 min-w-0">
            <?php if($img_path): ?>
              <img src="<?= $img_path ?>" onclick="previewFullImage('<?= $img_path ?>')" 
                   class="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs flex-shrink-0 cursor-pointer" alt="Thumbnail">
            <?php else: ?>
              <div class="w-12 h-12 rounded-xl <?= $is_job ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100' ?> flex items-center justify-center flex-shrink-0 font-bold">
                <i class="fa-solid <?= $is_job ? 'fa-briefcase' : 'fa-graduation-cap' ?> text-sm"></i>
              </div>
            <?php endif; ?>

            <div class="min-w-0">
              <div class="flex items-center gap-1.5 mb-0.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold <?= $is_job ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200' ?>">
                  <?= htmlspecialchars(ucfirst($row['type'])) ?>
                </span>
                <span class="text-[10px] text-slate-400 font-medium">ID: #<?= $row['id'] ?></span>
              </div>
              <h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-1"><?= htmlspecialchars($row['title']) ?></h4>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <a href="admin_jobs_education_edit.php?id=<?= $row['id'] ?>" title="Edit"
              class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-pen text-[11px]"></i>
            </a>
            <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this record?')" title="Delete"
              class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </a>
          </div>
        </div>

        <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100" id="mjobdesc-<?= $row['id'] ?>">
          <?= htmlspecialchars($row['description']) ?>
        </p>
        
        <div class="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
          <button type="button" onclick="toggleDescription('mjobdesc-<?= $row['id'] ?>', this)"
            class="text-blue-600 text-[11px] font-semibold hover:underline">
            Read more
          </button>
          <span class="text-slate-400 font-medium flex items-center gap-1">
            <i class="fa-regular fa-calendar text-[10px]"></i> <?= date("d M Y", strtotime($row['created_at'])) ?>
          </span>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No jobs or educational resources found</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD JOB / EDUCATION ================= -->
<div id="addModal" class="admin-modal-overlay">
  <div class="admin-modal-card">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-plus"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Add Job / Education</h3>
          <p class="text-[11px] text-slate-400">Post a new career opening or education resource</p>
        </div>
      </div>
      <button type="button" onclick="closeAddModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" enctype="multipart/form-data" class="flex flex-col flex-1 overflow-hidden">
      <div class="admin-modal-body space-y-4">

        <!-- TYPE SELECTION -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Category Type</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/30">
              <input type="radio" name="type" value="job" checked class="text-blue-600 focus:ring-blue-500">
              <span class="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <i class="fa-solid fa-briefcase text-blue-600"></i> Job Opportunity
              </span>
            </label>
            <label class="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50/30">
              <input type="radio" name="type" value="education" class="text-purple-600 focus:ring-purple-500">
              <span class="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <i class="fa-solid fa-graduation-cap text-purple-600"></i> Education
              </span>
            </label>
          </div>
        </div>

        <!-- TITLE -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Title / Designation</label>
          <input type="text" name="title" required placeholder="e.g. Senior Software Engineer or Scholarship 2026"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>

        <!-- DESCRIPTION -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description & Eligibility</label>
          <textarea name="description" rows="4" required placeholder="Provide role details, requirements, or application guidelines..."
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition resize-none"></textarea>
        </div>

        <!-- IMAGE -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Banner / Thumbnail (Optional)</label>
          <input type="file" name="image" accept="image/*"
            class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer">
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeAddModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_data" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i>
          <span>Publish Now</span>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Image Lightbox Modal -->
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

function previewFullImage(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxModal').classList.add('active');
}
function closeLightbox() {
  document.getElementById('lightboxModal').classList.remove('active');
}

function toggleDescription(id, btn) {
  let el = document.getElementById(id);
  if (el.classList.contains('line-clamp-2')) {
    el.classList.remove('line-clamp-2');
    btn.innerText = "Read less";
  } else {
    el.classList.add('line-clamp-2');
    btn.innerText = "Read more";
  }
}

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#jobsTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#jobsCards .job-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



