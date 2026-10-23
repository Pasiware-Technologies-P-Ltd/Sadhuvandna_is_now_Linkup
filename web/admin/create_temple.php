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

// ---------------- Delete Temple ----------------
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);

    $res = mysqli_query($con, "SELECT photo FROM tbl_temple WHERE temple_id=$id");
    $old = mysqli_fetch_assoc($res);

    if ($old && $old['photo'] != "" && file_exists("../uploads/temple/" . $old['photo'])) {
        unlink("../uploads/temple/" . $old['photo']);
    }

    mysqli_query($con, "DELETE FROM tbl_temple WHERE temple_id=$id");
    header("Location: create_temple.php?msg=".urlencode("Temple Deleted Successfully")."&type=success");
    exit;
}

// ---------------- Add Temple ----------------
if (isset($_POST['addTemple'])) {

    $mahant_name = mysqli_real_escape_string($con, trim($_POST['mahant_name']));
    $mobile = mysqli_real_escape_string($con, trim($_POST['mobile']));
    $village = mysqli_real_escape_string($con, trim($_POST['village']));
    $taluka = mysqli_real_escape_string($con, trim($_POST['taluka']));
    $district = mysqli_real_escape_string($con, trim($_POST['district']));

    $photo = "";
    if (!empty($_FILES['photo']['name'])) {

        $imgName = time() . "_" . $_FILES['photo']['name'];
        $target = "../uploads/temple/" . $imgName;

        if (!is_dir("../uploads/temple")) {
            mkdir("../uploads/temple", 0777, true);
        }

        move_uploaded_file($_FILES['photo']['tmp_name'], $target);
        $photo = $imgName;
    }

    $created_at = date("Y-m-d H:i:s");

    mysqli_query($con, "INSERT INTO tbl_temple 
        (mahant_name, mobile, village, taluka, district, photo, created_at)
        VALUES ('$mahant_name','$mobile','$village','$taluka','$district','$photo','$created_at')");

    header("Location: create_temple.php?msg=".urlencode("Temple Added Successfully")."&type=success");
    exit;
}

$temples = mysqli_query($con, "SELECT * FROM tbl_temple ORDER BY temple_id DESC");
$total_temples = mysqli_num_rows($temples);
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
            Temple Directory
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage temples, mahants, and sacred community places</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" id="searchInput" placeholder="Search temple or mahant...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Temples: <span class="text-blue-600 font-bold"><?= $total_temples ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add Temple</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="templeTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3 w-24">Photo</th>
            <th class="premium-th px-5 py-3">Mahant Details</th>
            <th class="premium-th px-5 py-3 w-36">Mobile</th>
            <th class="premium-th px-5 py-3">Location (Village / Taluka)</th>
            <th class="premium-th px-5 py-3 w-36">District</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="templeTableBody">
          <?php $sr = 1; while ($row = mysqli_fetch_assoc($temples)): ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <?php if (!empty($row['photo']) && file_exists("../uploads/temple/".$row['photo'])): ?>
                  <img src="../uploads/temple/<?= htmlspecialchars($row['photo']) ?>" 
                       class="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition"
                       onclick="previewFullImage('../uploads/temple/<?= htmlspecialchars($row['photo']) ?>')"
                       alt="Mahant">
                <?php else: ?>
                  <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <i class="fa-solid fa-place-of-worship text-sm text-slate-400"></i>
                  </div>
                <?php endif; ?>
              </td>

              <td class="px-5 py-3.5">
                <span class="font-bold text-slate-900 text-sm block"><?= htmlspecialchars($row['mahant_name']) ?></span>
                <span class="text-[11px] text-slate-400 font-medium">ID: #<?= $row['temple_id'] ?></span>
              </td>

              <td class="px-5 py-3.5 text-xs font-semibold text-slate-700">
                <div class="flex items-center gap-1.5">
                  <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i>
                  <?= htmlspecialchars($row['mobile']) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-600 font-medium">
                <div><?= htmlspecialchars($row['village']) ?></div>
                <div class="text-[11px] text-slate-400">Taluka: <?= htmlspecialchars($row['taluka']) ?></div>
              </td>

              <td class="px-5 py-3.5 text-xs font-semibold text-slate-700">
                <span class="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                  <?= htmlspecialchars($row['district']) ?>
                </span>
              </td>

              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <a href="edit_temple.php?id=<?= $row['temple_id'] ?>" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </a>
                  <a href="create_temple.php?delete=<?= $row['temple_id'] ?>" 
                    onclick="return confirm('Delete this temple permanently?')" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php endwhile; ?>

          <?php if($total_temples == 0): ?>
            <tr>
              <td colspan="7" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-place-of-worship"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No temples registered yet</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add Temple" to register a new temple</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Temples -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="templeCards">
      <?php 
      if($total_temples > 0):
        mysqli_data_seek($temples, 0);
        while($row = mysqli_fetch_assoc($temples)):
          $img_path = (!empty($row['photo']) && file_exists("../uploads/temple/".$row['photo'])) ? "../uploads/temple/".htmlspecialchars($row['photo']) : null;
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs temple-card transition hover:shadow-xs">
        <div class="flex items-start justify-between gap-2.5 mb-2.5">
          <div class="flex items-start gap-2.5 min-w-0">
            <?php if($img_path): ?>
              <img src="<?= $img_path ?>" onclick="previewFullImage('<?= $img_path ?>')" 
                   class="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0 cursor-pointer" alt="Mahant">
            <?php else: ?>
              <div class="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                <i class="fa-solid fa-place-of-worship text-sm text-slate-400"></i>
              </div>
            <?php endif; ?>

            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug truncate"><?= htmlspecialchars($row['mahant_name']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium">Temple ID: #<?= $row['temple_id'] ?></p>
              <a href="tel:<?= htmlspecialchars($row['mobile']) ?>" class="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                <i class="fa-solid fa-phone text-[9px]"></i> <?= htmlspecialchars($row['mobile']) ?>
              </a>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <a href="edit_temple.php?id=<?= $row['temple_id'] ?>" title="Edit"
              class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-pen text-[11px]"></i>
            </a>
            <a href="create_temple.php?delete=<?= $row['temple_id'] ?>" onclick="return confirm('Delete this temple permanently?')" title="Delete"
              class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </a>
          </div>
        </div>

        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-400 font-medium">Location:</span>
            <span class="font-medium text-slate-700"><?= htmlspecialchars($row['village']) ?>, <?= htmlspecialchars($row['taluka']) ?></span>
          </div>
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-400 font-medium">District:</span>
            <span class="inline-block bg-slate-200/70 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
              <?= htmlspecialchars($row['district']) ?>
            </span>
          </div>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No temples registered yet</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD TEMPLE ================= -->
<div id="addModal" class="admin-modal-overlay">
  <div class="admin-modal-card" style="max-width: 38rem;">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-place-of-worship"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Add New Temple</h3>
          <p class="text-[11px] text-slate-400">Register mahant and temple location details</p>
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
          <div class="w-16 h-16 rounded-full bg-white border-2 border-dashed border-blue-300 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img id="previewImg" src="" class="hidden w-full h-full object-cover">
            <i id="defaultIcon" class="fa-solid fa-user-tie text-slate-300 text-2xl"></i>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mahant Photo (Optional)</label>
            <input type="file" name="photo" id="photo" class="hidden" accept="image/*" onchange="showPreview(event)">
            <label for="photo" class="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs transition">
              <i class="fa-solid fa-camera text-slate-400"></i> Choose Photo
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mahant Name *</label>
            <input type="text" name="mahant_name" required placeholder="Enter mahant full name"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mobile Number *</label>
            <input type="text" name="mobile" required placeholder="10-digit mobile number"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Village / Town *</label>
            <input type="text" name="village" required placeholder="Village name"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Taluka / Tehsil *</label>
            <input type="text" name="taluka" required placeholder="Taluka name"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">District *</label>
            <input type="text" name="district" required placeholder="District name"
              class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
          </div>
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeAddModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="addTemple" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i>
          <span>Save Temple</span>
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

function showPreview(event) {
  if (event.target.files && event.target.files[0]) {
    document.getElementById("previewImg").src = URL.createObjectURL(event.target.files[0]);
    document.getElementById("previewImg").classList.remove("hidden");
    document.getElementById("defaultIcon").classList.add("hidden");
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
  document.querySelectorAll("#templeTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#templeCards .temple-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



