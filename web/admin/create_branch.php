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
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_branch'])) {
    $village = trim($_POST['village'] ?? '');
    $branch_name = trim($_POST['branch_name'] ?? '');
    $mahant_name = trim($_POST['mahant_name'] ?? '');
    $mahant_mobile = trim($_POST['mahant_mobile'] ?? '');
    $details = trim($_POST['details'] ?? '');

    if($village=='') $errors[]="Branch village required.";
    if($branch_name=='') $errors[]="Branch name required.";
    if($mahant_name=='') $errors[]="Mahant name required.";
    if($mahant_mobile=='') $errors[]="Mahant mobile required.";
    if($details=='') $errors[]="Details required.";

    $image_name = "";
    if(!empty($_FILES['photo']['name'])){
        $file=$_FILES['photo'];
        $allowed_types=["image/jpeg","image/jpg","image/png","image/webp"];
        if(!in_array(strtolower($file['type']),$allowed_types)) $errors[]="Only JPG/PNG/WEBP allowed!";
        elseif($file['size']>2*1024*1024) $errors[]="Image must be under 2MB!";
        else{
            $image_name = time().'_'.preg_replace("/[^A-Za-z0-9\._-]/","_",$file['name']);
            $uploadDir="../uploads/branches/";
            if(!is_dir($uploadDir)) mkdir($uploadDir,0777,true);
            move_uploaded_file($file['tmp_name'],$uploadDir.$image_name);
        }
    }

    if(empty($errors)){
        $village=mysqli_real_escape_string($con,$village);
        $branch_name=mysqli_real_escape_string($con,$branch_name);
        $mahant_name=mysqli_real_escape_string($con,$mahant_name);
        $mahant_mobile=mysqli_real_escape_string($con,$mahant_mobile);
        $details=mysqli_real_escape_string($con,$details);
        $created_at=date("Y-m-d H:i:s");

        $sql="INSERT INTO tbl_branch 
              (branch_village,branch_name,mahant_name,mahant_mobile,details,photo,created_at)
              VALUES ('$village','$branch_name','$mahant_name','$mahant_mobile','$details','$image_name','$created_at')";
        if(mysqli_query($con,$sql)) {
            header("Location: create_branch.php?msg=".urlencode("Branch Created Successfully")."&type=success");
            exit;
        } else {
            $errors[]="Database error!";
        }
    }
}

if(isset($_GET['delete'])){
    $id=intval($_GET['delete']);
    $q=mysqli_query($con,"SELECT photo FROM tbl_branch WHERE id=$id");
    $r=mysqli_fetch_assoc($q);
    if($r && !empty($r['photo']) && file_exists("../uploads/branches/".$r['photo'])){
        unlink("../uploads/branches/".$r['photo']);
    }
    mysqli_query($con,"DELETE FROM tbl_branch WHERE id=$id");
    header("Location: create_branch.php?msg=".urlencode("Branch Deleted")."&type=success");
    exit;
}

$branches=mysqli_query($con,"SELECT * FROM tbl_branch ORDER BY id DESC");
$total_branches = mysqli_num_rows($branches);
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

  <?php if(isset($_GET['msg']) || isset($_GET['success'])): 
    $is_success = (isset($_GET['type']) && $_GET['type']=='success') || isset($_GET['success']);
    $msg_text = isset($_GET['msg']) ? $_GET['msg'] : "Branch saved successfully.";
  ?>
    <div class="mb-5 p-4 rounded-xl flex items-center justify-between border <?= $is_success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800' ?>">
      <div class="flex items-center gap-3">
        <i class="fa-solid <?= $is_success ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600' ?> text-lg"></i>
        <span class="text-xs font-semibold"><?= htmlspecialchars($msg_text) ?></span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
    </div>
  <?php endif; ?>

  <?php if(!empty($errors)): ?>
    <div class="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-1">
      <?php foreach($errors as $e): ?>
        <div class="flex items-center gap-2"><i class="fa-solid fa-circle-exclamation text-rose-600"></i> <?= htmlspecialchars($e) ?></div>
      <?php endforeach; ?>
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
            Community Branches
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage localized regional branch centers and executive mahants</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" id="searchInput" placeholder="Search branch or mahant...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Branches: <span class="text-blue-600 font-bold"><?= $total_branches ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add Branch</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="branchTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3 w-24">Photo</th>
            <th class="premium-th px-5 py-3">Branch Details</th>
            <th class="premium-th px-5 py-3">Mahant In-Charge</th>
            <th class="premium-th px-5 py-3 w-36">Mobile</th>
            <th class="premium-th px-5 py-3 w-36">Location</th>
            <th class="premium-th px-5 py-3 w-1/4">Details & Notes</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="branchTableBody">
          <?php $sr = 1; while($row = mysqli_fetch_assoc($branches)): ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <?php if(!empty($row['photo']) && file_exists("../uploads/branches/".$row['photo'])): ?>
                  <img src="../uploads/branches/<?= htmlspecialchars($row['photo']) ?>" 
                       class="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition"
                       onclick="previewFullImage('../uploads/branches/<?= htmlspecialchars($row['photo']) ?>')"
                       alt="Mahant">
                <?php else: ?>
                  <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <i class="fa-solid fa-code-branch text-sm text-slate-400"></i>
                  </div>
                <?php endif; ?>
              </td>

              <td class="px-5 py-3.5">
                <span class="font-bold text-slate-900 text-sm block"><?= htmlspecialchars($row['branch_name']) ?></span>
                <span class="text-[11px] text-slate-400 font-medium">ID: #<?= $row['id'] ?></span>
              </td>

              <td class="px-5 py-3.5 text-xs font-semibold text-slate-800">
                <?= htmlspecialchars($row['mahant_name']) ?>
              </td>

              <td class="px-5 py-3.5 text-xs font-semibold text-slate-700">
                <div class="flex items-center gap-1.5">
                  <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i>
                  <?= htmlspecialchars($row['mahant_mobile']) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-xs font-semibold text-slate-700">
                <span class="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                  <?= htmlspecialchars($row['branch_village']) ?>
                </span>
              </td>

              <td class="px-5 py-3.5">
                <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed" id="detail-<?= $row['id'] ?>">
                  <?= htmlspecialchars($row['details']) ?>
                </p>
                <button type="button" onclick="toggleDetail('detail-<?= $row['id'] ?>', this)"
                  class="text-blue-600 text-[11px] font-semibold hover:underline mt-1 block">
                  See more
                </button>
              </td>

              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <a href="branch_edit?id=<?= $row['id'] ?>" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </a>
                  <a href="create_branch.php?delete=<?= $row['id'] ?>" 
                    onclick="return confirm('Delete this branch?')" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php endwhile; ?>

          <?php if($total_branches == 0): ?>
            <tr>
              <td colspan="8" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-code-branch"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No branches added yet</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add Branch" to set up a new regional branch</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Branches -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="branchCards">
      <?php 
      if($total_branches > 0):
        mysqli_data_seek($branches, 0);
        while($row = mysqli_fetch_assoc($branches)):
          $img_path = (!empty($row['photo']) && file_exists("../uploads/branches/".$row['photo'])) ? "../uploads/branches/".htmlspecialchars($row['photo']) : null;
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs branch-card transition hover:shadow-xs">
        <div class="flex items-start justify-between gap-2.5 mb-2.5">
          <div class="flex items-start gap-2.5 min-w-0">
            <?php if($img_path): ?>
              <img src="<?= $img_path ?>" onclick="previewFullImage('<?= $img_path ?>')" 
                   class="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0 cursor-pointer" alt="Mahant">
            <?php else: ?>
              <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                <i class="fa-solid fa-code-branch text-sm text-slate-400"></i>
              </div>
            <?php endif; ?>

            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug truncate"><?= htmlspecialchars($row['branch_name']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium">Mahant: <?= htmlspecialchars($row['mahant_name']) ?></p>
              <a href="tel:<?= htmlspecialchars($row['mahant_mobile']) ?>" class="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                <i class="fa-solid fa-phone text-[9px]"></i> <?= htmlspecialchars($row['mahant_mobile']) ?>
              </a>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <a href="branch_edit?id=<?= $row['id'] ?>" title="Edit"
              class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-pen text-[11px]"></i>
            </a>
            <a href="create_branch.php?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this branch?')" title="Delete"
              class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </a>
          </div>
        </div>

        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-400 font-medium">Village:</span>
            <span class="inline-block bg-slate-200/70 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
              <?= htmlspecialchars($row['branch_village']) ?>
            </span>
          </div>
          <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1 border-t border-slate-200/60" id="mdetail-<?= $row['id'] ?>">
            <?= htmlspecialchars($row['details']) ?>
          </p>
          <button type="button" onclick="toggleDetail('mdetail-<?= $row['id'] ?>', this)"
            class="text-blue-600 text-[11px] font-semibold hover:underline">
            See more
          </button>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No branches added yet</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD BRANCH ================= -->
<div id="addModal" class="admin-modal-overlay">
  <div class="admin-modal-card" style="max-width: 38rem;">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-code-branch"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Create Regional Branch</h3>
          <p class="text-[11px] text-slate-400">Register new community branch center and leadership</p>
        </div>
      </div>
      <button type="button" onclick="closeAddModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" enctype="multipart/form-data" class="flex flex-col flex-1 overflow-hidden">
      <div class="admin-modal-body space-y-4">
        
        <!-- Mahant Photo Upload -->
        <div class="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <div class="w-16 h-16 rounded-full bg-white border-2 border-dashed border-blue-300 flex items-center justify-center overflow-hidden flex-shrink-0" id="branch-photo-preview">
            <i class="fa-solid fa-user-tie text-slate-300 text-2xl"></i>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mahant Photo (Optional)</label>
            <input type="file" name="photo" id="photoInput" class="hidden" accept="image/*" onchange="previewBranchPhoto(this)">
            <label for="photoInput" class="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs transition">
              <i class="fa-solid fa-camera text-slate-400"></i> Choose Photo
            </label>
            <span class="text-[10px] text-slate-400 block mt-0.5">JPG/PNG/WEBP (Max 2MB)</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Branch Name *</label>
            <input type="text" name="branch_name" required placeholder="e.g. Surat Central Branch"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Branch Village / City *</label>
            <input type="text" name="village" required placeholder="Village or City name"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mahant In-Charge *</label>
            <input type="text" name="mahant_name" required placeholder="Full name of Mahant"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mahant Mobile *</label>
            <input type="text" name="mahant_mobile" required placeholder="10-digit mobile number"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Branch Details & Notes *</label>
            <textarea name="details" rows="3" required placeholder="Provide address, meeting times or committee details..."
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition resize-none"></textarea>
          </div>
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeAddModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_branch" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i>
          <span>Save Branch</span>
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

function previewBranchPhoto(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('branch-photo-preview').innerHTML =
        '<img src="' + e.target.result + '" class="w-full h-full object-cover rounded-full">';
    }
    reader.readAsDataURL(input.files[0]);
  }
}

function previewFullImage(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxModal').classList.add('active');
}
function closeLightbox() {
  document.getElementById('lightboxModal').classList.remove('active');
}

function toggleDetail(id, btn) {
  let el = document.getElementById(id);
  if (el.classList.contains('line-clamp-2')) {
    el.classList.remove('line-clamp-2');
    btn.innerText = "See less";
  } else {
    el.classList.add('line-clamp-2');
    btn.innerText = "See more";
  }
}

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#branchTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#branchCards .branch-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



