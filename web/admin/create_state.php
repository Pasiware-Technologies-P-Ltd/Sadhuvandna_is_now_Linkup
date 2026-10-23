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

// Create table if not exists
mysqli_query($con, "CREATE TABLE IF NOT EXISTS tbl_states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

date_default_timezone_set("Asia/Kolkata");
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['submit_state'])) {
        $state_name = trim($_POST['state_name'] ?? '');

        if($state_name == '') $errors[] = "State name is required.";

        if(empty($errors)){
            $state_name = mysqli_real_escape_string($con, $state_name);
            $created_at = date("Y-m-d H:i:s");

            $sql = "INSERT INTO tbl_states (state_name, created_at) VALUES ('$state_name', '$created_at')";
            if(mysqli_query($con, $sql)) {
                header("Location: create_state.php?msg=".urlencode("State Created Successfully")."&type=success");
                exit;
            } else {
                $errors[] = "Database error: " . mysqli_error($con);
            }
        }
    } elseif (isset($_POST['update_state'])) {
        $id = intval($_POST['state_id']);
        $state_name = trim($_POST['state_name'] ?? '');

        if($state_name == '') $errors[] = "State name is required.";

        if(empty($errors)){
            $state_name = mysqli_real_escape_string($con, $state_name);
            
            $sql = "UPDATE tbl_states SET state_name='$state_name' WHERE id=$id";
            if(mysqli_query($con, $sql)) {
                header("Location: create_state.php?msg=".urlencode("State Updated Successfully")."&type=success");
                exit;
            } else {
                $errors[] = "Database error: " . mysqli_error($con);
            }
        }
    }
}

if(isset($_GET['delete'])){
    $id = intval($_GET['delete']);
    mysqli_query($con, "DELETE FROM tbl_districts WHERE state_id=$id");
    mysqli_query($con, "DELETE FROM tbl_states WHERE id=$id");
    header("Location: create_state.php?msg=".urlencode("State and associated districts deleted")."&type=success");
    exit;
}

$states = mysqli_query($con, "SELECT s.*, (SELECT COUNT(*) FROM tbl_districts d WHERE d.state_id = s.id) AS district_count FROM tbl_states s ORDER BY s.id DESC");
$total_states = mysqli_num_rows($states);
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
            State Management
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage territorial state entities for directory and member mapping</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" id="searchInput" placeholder="Search state...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          States: <span class="text-blue-600 font-bold"><?= $total_states ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddStateModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add State</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="statesTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3">State Name</th>
            <th class="premium-th px-5 py-3 w-40">Districts Count</th>
            <th class="premium-th px-5 py-3 w-44">Created Date</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="statesTableBody">
          <?php $sr = 1; while($row = mysqli_fetch_assoc($states)): ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <i class="fa-solid fa-map text-xs"></i>
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 text-sm block"><?= htmlspecialchars($row['state_name']) ?></span>
                    <span class="text-[11px] text-slate-400 font-medium">State ID: #<?= $row['id'] ?></span>
                  </div>
                </div>
              </td>

              <td class="px-5 py-3.5">
                <a href="create_district.php?state=<?= $row['id'] ?>" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition" title="View districts in this state">
                  <i class="fa-solid fa-map-pin text-[10px] text-blue-600"></i>
                  <?= intval($row['district_count']) ?> Districts
                </a>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y", strtotime($row['created_at'])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button type="button" onclick="openEditStateModal(<?= $row['id'] ?>, '<?= htmlspecialchars(addslashes($row['state_name'])) ?>')" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs cursor-pointer">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                  <a href="?delete=<?= $row['id'] ?>" 
                    onclick="return confirm('Delete this state? All linked districts will also be removed.')" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php endwhile; ?>

          <?php if($total_states == 0): ?>
            <tr>
              <td colspan="5" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-map"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No states registered yet</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add State" to create a new state entity</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: States -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="stateCards">
      <?php 
      if($total_states > 0):
        mysqli_data_seek($states, 0);
        while($row = mysqli_fetch_assoc($states)):
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs state-card transition hover:shadow-xs">
        <div class="flex items-center justify-between gap-3 mb-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
              <i class="fa-solid fa-map text-xs"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug truncate"><?= htmlspecialchars($row['state_name']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium">State ID: #<?= $row['id'] ?></p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" onclick="openEditStateModal(<?= $row['id'] ?>, '<?= htmlspecialchars(addslashes($row['state_name'])) ?>')" title="Edit"
              class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs cursor-pointer">
              <i class="fa-solid fa-pen text-[11px]"></i>
            </button>
            <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this state? All linked districts will also be removed.')" title="Delete"
              class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </a>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          <a href="create_district.php?state=<?= $row['id'] ?>" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
            <i class="fa-solid fa-map-pin text-[9px]"></i> <?= intval($row['district_count']) ?> Districts
          </a>
          <span class="text-slate-400 font-medium flex items-center gap-1">
            <i class="fa-regular fa-calendar text-[10px]"></i> <?= date("d M Y", strtotime($row['created_at'])) ?>
          </span>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No states registered yet</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD / EDIT STATE ================= -->
<div id="stateModal" class="admin-modal-overlay">
  <div class="admin-modal-card">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-map"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight" id="stateModalTitle">Add New State</h3>
          <p class="text-[11px] text-slate-400">Enter official state name for geographical directory</p>
        </div>
      </div>
      <button type="button" onclick="closeStateModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" class="flex flex-col flex-1 overflow-hidden">
      <input type="hidden" name="state_id" id="modalStateId" value="">

      <div class="admin-modal-body space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">State Name *</label>
          <input type="text" name="state_name" id="modalStateName" required placeholder="e.g. Gujarat, Maharashtra, Rajasthan"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>
      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeStateModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_state" id="modalSubmitBtn" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i>
          <span id="modalSubmitText">Save State</span>
        </button>
      </div>
    </form>
  </div>
</div>

</body>
<script>
function openAddStateModal() {
  document.getElementById('modalStateId').value = '';
  document.getElementById('modalStateName').value = '';
  document.getElementById('stateModalTitle').innerText = 'Add New State';
  document.getElementById('modalSubmitBtn').name = 'submit_state';
  document.getElementById('modalSubmitText').innerText = 'Save State';
  document.getElementById('stateModal').classList.add('active');
  setTimeout(() => document.getElementById('modalStateName').focus(), 150);
}

function openEditStateModal(id, name) {
  document.getElementById('modalStateId').value = id;
  document.getElementById('modalStateName').value = name;
  document.getElementById('stateModalTitle').innerText = 'Edit State';
  document.getElementById('modalSubmitBtn').name = 'update_state';
  document.getElementById('modalSubmitText').innerText = 'Update State';
  document.getElementById('stateModal').classList.add('active');
  setTimeout(() => document.getElementById('modalStateName').focus(), 150);
}

function closeStateModal() {
  document.getElementById('stateModal').classList.remove('active');
}

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#statesTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#stateCards .state-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



