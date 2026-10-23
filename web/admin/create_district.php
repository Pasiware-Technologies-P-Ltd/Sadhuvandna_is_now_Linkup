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

// Create tables if they do not exist
mysqli_query($con, "CREATE TABLE IF NOT EXISTS tbl_states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

mysqli_query($con, "CREATE TABLE IF NOT EXISTS tbl_districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_id INT NOT NULL,
    district_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (state_id) REFERENCES tbl_states(id) ON DELETE CASCADE
)");

date_default_timezone_set("Asia/Kolkata");
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['submit_district'])) {
        $state_id = intval($_POST['state_id'] ?? 0);
        $district_name = trim($_POST['district_name'] ?? '');

        if($state_id <= 0) $errors[] = "Please select a valid state.";
        if($district_name == '') $errors[] = "District name is required.";

        if(empty($errors)){
            $district_name = mysqli_real_escape_string($con, $district_name);
            $created_at = date("Y-m-d H:i:s");

            $sql = "INSERT INTO tbl_districts (state_id, district_name, created_at) VALUES ($state_id, '$district_name', '$created_at')";
            if(mysqli_query($con, $sql)) {
                header("Location: create_district.php?msg=".urlencode("District Created Successfully")."&type=success");
                exit;
            } else {
                $errors[] = "Database error: " . mysqli_error($con);
            }
        }
    } elseif (isset($_POST['update_district'])) {
        $id = intval($_POST['district_id']);
        $state_id = intval($_POST['state_id'] ?? 0);
        $district_name = trim($_POST['district_name'] ?? '');

        if($state_id <= 0) $errors[] = "Please select a valid state.";
        if($district_name == '') $errors[] = "District name is required.";

        if(empty($errors)){
            $district_name = mysqli_real_escape_string($con, $district_name);
            
            $sql = "UPDATE tbl_districts SET state_id=$state_id, district_name='$district_name' WHERE id=$id";
            if(mysqli_query($con, $sql)) {
                header("Location: create_district.php?msg=".urlencode("District Updated Successfully")."&type=success");
                exit;
            } else {
                $errors[] = "Database error: " . mysqli_error($con);
            }
        }
    }
}

if(isset($_GET['delete'])){
    $id = intval($_GET['delete']);
    mysqli_query($con, "DELETE FROM tbl_districts WHERE id=$id");
    header("Location: create_district.php?msg=".urlencode("District Deleted")."&type=success");
    exit;
}

// Fetch states for dropdown
$states = mysqli_query($con, "SELECT * FROM tbl_states ORDER BY state_name ASC");

// Fetch districts for list view (optionally filtered by state)
$state_filter = isset($_GET['state']) ? intval($_GET['state']) : 0;
$where_clause = $state_filter > 0 ? "WHERE d.state_id = $state_filter" : "";
$districts = mysqli_query($con, "SELECT d.*, s.state_name FROM tbl_districts d LEFT JOIN tbl_states s ON d.state_id = s.id $where_clause ORDER BY d.id DESC");
$total_districts = mysqli_num_rows($districts);
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
            District Management
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage district entities grouped under states for community demographics</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <?php if($state_filter > 0): ?>
          <a href="create_district.php" class="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
            <i class="fa-solid fa-filter-circle-xmark"></i> Clear State Filter
          </a>
        <?php endif; ?>

        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" id="searchInput" placeholder="Search district or state...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Districts: <span class="text-blue-600 font-bold"><?= $total_districts ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddDistrictModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add District</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="districtsTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3">District Name</th>
            <th class="premium-th px-5 py-3 w-48">Parent State</th>
            <th class="premium-th px-5 py-3 w-44">Created Date</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="districtsTableBody">
          <?php $sr = 1; while($row = mysqli_fetch_assoc($districts)): ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <i class="fa-solid fa-map-pin text-xs"></i>
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 text-sm block"><?= htmlspecialchars($row['district_name']) ?></span>
                    <span class="text-[11px] text-slate-400 font-medium">District ID: #<?= $row['id'] ?></span>
                  </div>
                </div>
              </td>

              <td class="px-5 py-3.5">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  <i class="fa-solid fa-map text-[10px] text-slate-400"></i>
                  <?= htmlspecialchars($row['state_name'] ?: 'Unassigned') ?>
                </span>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y", strtotime($row['created_at'])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button type="button" onclick="openEditDistrictModal(<?= $row['id'] ?>, <?= $row['state_id'] ?>, '<?= htmlspecialchars(addslashes($row['district_name'])) ?>')" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs cursor-pointer">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                  <a href="?delete=<?= $row['id'] ?>" 
                    onclick="return confirm('Delete this district?')" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php endwhile; ?>

          <?php if($total_districts == 0): ?>
            <tr>
              <td colspan="5" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-map-pin"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No districts registered yet</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add District" to create a new district entry</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Districts -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="districtCards">
      <?php 
      if($total_districts > 0):
        mysqli_data_seek($districts, 0);
        while($row = mysqli_fetch_assoc($districts)):
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs district-card transition hover:shadow-xs">
        <div class="flex items-center justify-between gap-3 mb-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
              <i class="fa-solid fa-map-pin text-xs"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug truncate"><?= htmlspecialchars($row['district_name']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium">District ID: #<?= $row['id'] ?></p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" onclick="openEditDistrictModal(<?= $row['id'] ?>, <?= $row['state_id'] ?>, '<?= htmlspecialchars(addslashes($row['district_name'])) ?>')" title="Edit"
              class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs cursor-pointer">
              <i class="fa-solid fa-pen text-[11px]"></i>
            </button>
            <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this district?')" title="Delete"
              class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </a>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            <i class="fa-solid fa-map text-[9px] text-slate-400"></i> <?= htmlspecialchars($row['state_name'] ?: 'Unassigned') ?>
          </span>
          <span class="text-slate-400 font-medium flex items-center gap-1">
            <i class="fa-regular fa-calendar text-[10px]"></i> <?= date("d M Y", strtotime($row['created_at'])) ?>
          </span>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No districts registered yet</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD / EDIT DISTRICT ================= -->
<div id="districtModal" class="admin-modal-overlay">
  <div class="admin-modal-card">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-map-pin"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight" id="districtModalTitle">Add New District</h3>
          <p class="text-[11px] text-slate-400">Link district to corresponding parent state</p>
        </div>
      </div>
      <button type="button" onclick="closeDistrictModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" class="flex flex-col flex-1 overflow-hidden">
      <input type="hidden" name="district_id" id="modalDistrictId" value="">

      <div class="admin-modal-body space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select State *</label>
          <select name="state_id" id="modalStateSelect" required class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
            <option value="">-- Choose State --</option>
            <?php mysqli_data_seek($states, 0); while($st = mysqli_fetch_assoc($states)): ?>
              <option value="<?= $st['id'] ?>"><?= htmlspecialchars($st['state_name']) ?></option>
            <?php endwhile; ?>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">District Name *</label>
          <input type="text" name="district_name" id="modalDistrictName" required placeholder="e.g. Ahmedabad, Mumbai Suburban, Jaipur"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>
      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeDistrictModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_district" id="modalDistrictSubmitBtn" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i>
          <span id="modalDistrictSubmitText">Save District</span>
        </button>
      </div>
    </form>
  </div>
</div>

</body>
<script>
function openAddDistrictModal() {
  document.getElementById('modalDistrictId').value = '';
  document.getElementById('modalDistrictName').value = '';
  document.getElementById('modalStateSelect').value = '<?= $state_filter > 0 ? $state_filter : "" ?>';
  document.getElementById('districtModalTitle').innerText = 'Add New District';
  document.getElementById('modalDistrictSubmitBtn').name = 'submit_district';
  document.getElementById('modalDistrictSubmitText').innerText = 'Save District';
  document.getElementById('districtModal').classList.add('active');
  setTimeout(() => document.getElementById('modalDistrictName').focus(), 150);
}

function openEditDistrictModal(id, stateId, name) {
  document.getElementById('modalDistrictId').value = id;
  document.getElementById('modalDistrictName').value = name;
  document.getElementById('modalStateSelect').value = stateId;
  document.getElementById('districtModalTitle').innerText = 'Edit District';
  document.getElementById('modalDistrictSubmitBtn').name = 'update_district';
  document.getElementById('modalDistrictSubmitText').innerText = 'Update District';
  document.getElementById('districtModal').classList.add('active');
  setTimeout(() => document.getElementById('modalDistrictName').focus(), 150);
}

function closeDistrictModal() {
  document.getElementById('districtModal').classList.remove('active');
}

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#districtsTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#districtCards .district-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



