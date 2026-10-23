<?php
session_start();
include("../connection.php");

// 1. Session check
if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

// Auto-migration: Create table if not exists
$con->query("SET SESSION sql_mode = ''");
$con->query("
    CREATE TABLE IF NOT EXISTS `tbl_anchor_applications` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT UNIQUE NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `phone` VARCHAR(50) NOT NULL,
        `email` VARCHAR(100) NOT NULL,
        `education` VARCHAR(255) NOT NULL,
        `photo` VARCHAR(255) NOT NULL,
        `aadhaar` VARCHAR(255) NOT NULL,
        `resume` VARCHAR(255) NOT NULL,
        `status` VARCHAR(50) DEFAULT 'Pending',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// 2. Handle Action (Approve / Reject / Reset)
if (isset($_POST['action']) && isset($_POST['id'])) {
    $id = intval($_POST['id']);
    $action = $_POST['action'];

    if ($action === "approve") {
        $status = "Approved";
    } elseif ($action === "reject") {
        $status = "Rejected";
    } elseif ($action === "pending") {
        $status = "Pending";
    } else {
        $_SESSION['msg'] = "Invalid action specified!";
        header("Location: admin_anchor_applications.php");
        exit;
    }

    $q = mysqli_query($con, "UPDATE tbl_anchor_applications SET status='$status' WHERE id=$id");
    if ($q) {
        $_SESSION['msg'] = "Application status updated to '$status' successfully!";
        $_SESSION['msg_type'] = "success";
    } else {
        $_SESSION['msg'] = "Database error while updating status: " . mysqli_error($con);
        $_SESSION['msg_type'] = "error";
    }
    header("Location: admin_anchor_applications.php");
    exit;
}

// 3. Fetch applications
$applications_q = mysqli_query($con, "SELECT * FROM tbl_anchor_applications ORDER BY id DESC");
$apps = [];
$pending_count = 0;
$approved_count = 0;
$rejected_count = 0;

if ($applications_q) {
    while ($row = mysqli_fetch_assoc($applications_q)) {
        $apps[] = $row;
        if ($row['status'] === 'Pending') $pending_count++;
        elseif ($row['status'] === 'Approved') $approved_count++;
        elseif ($row['status'] === 'Rejected') $rejected_count++;
    }
}
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

  <!-- Premium Card Wrapper -->
  <div class="premium-card overflow-hidden mb-6">
    <!-- Sub-Header / Action Bar -->
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="index.php" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">Anchor Applications</h2>
          <p class="text-xs text-slate-400 font-medium">Review and manage anchor applicants from the community</p>
        </div>
      </div>

      <div class="page-subheader-right">
        <!-- Status Counters -->
        <span class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          Pending: <span class="text-amber-600 font-bold"><?= $pending_count ?></span>
        </span>
        <span class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          Approved: <span class="text-emerald-600 font-bold"><?= $approved_count ?></span>
        </span>
        <span class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          Rejected: <span class="text-rose-600 font-bold"><?= $rejected_count ?></span>
        </span>
        <!-- Search -->
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input type="search" id="searchInput" placeholder="Search name, phone, email...">
        </div>
      </div>
    </div>

    <!-- Tab Filter Bar -->
    <div class="px-5 py-2.5 border-b border-slate-100 flex gap-2 overflow-x-auto bg-white">
      <button onclick="filterStatus('all')" class="status-tab-btn flex-shrink-0 px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm transition" id="tab-all">All (<?= count($apps) ?>)</button>
      <button onclick="filterStatus('Pending')" class="status-tab-btn flex-shrink-0 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition" id="tab-Pending">
        <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Pending (<?= $pending_count ?>)</span>
      </button>
      <button onclick="filterStatus('Approved')" class="status-tab-btn flex-shrink-0 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition" id="tab-Approved">
        <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Approved (<?= $approved_count ?>)</span>
      </button>
      <button onclick="filterStatus('Rejected')" class="status-tab-btn flex-shrink-0 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition" id="tab-Rejected">
        <span class="inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Rejected (<?= $rejected_count ?>)</span>
      </button>
    </div>

  <!-- Message Toast -->
  <?php if(isset($_SESSION['msg'])): ?>
    <?php 
      $is_err = ($_SESSION['msg_type'] ?? '') === 'error';
    ?>
    <div class="px-5 py-3 border-b border-slate-100 flex items-center gap-3 <?= $is_err ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800' ?>">
      <i class="fa-solid <?= $is_err ? 'fa-triangle-exclamation' : 'fa-circle-check' ?> text-base"></i>
      <span class="text-xs font-semibold flex-1"><?= $_SESSION['msg']; unset($_SESSION['msg']); unset($_SESSION['msg_type']); ?></span>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
    </div>
  <?php endif; ?>

  <?php if (empty($apps)): ?>
    <div class="py-16 text-center">
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3 mx-auto">
        <i class="fa-solid fa-microphone-lines"></i>
      </div>
      <p class="text-sm font-semibold text-slate-600">No Applications Yet</p>
      <p class="text-xs text-slate-400 mt-0.5">Anchor applications will show up here once users apply from the mobile app.</p>
    </div>
  <?php else: ?>

    <!-- Scrollable Table (Desktop) -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 240px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="appsTable">
        <thead class="sticky top-0 z-10">
          <tr>
            <th class="premium-th px-5 py-3 w-16">Photo</th>
            <th class="premium-th px-5 py-3">Applicant</th>
            <th class="premium-th px-5 py-3 w-44">Education</th>
            <th class="premium-th px-5 py-3 w-52">Documents</th>
            <th class="premium-th px-5 py-3 w-36">Applied Date</th>
            <th class="premium-th px-5 py-3 w-28">Status</th>
            <th class="premium-th px-5 py-3 text-center w-32">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
            <?php foreach ($apps as $app): ?>
              <tr class="hover:bg-slate-50/50 transition duration-150 app-row" data-status="<?= htmlspecialchars($app['status']) ?>">
                
                <!-- Photo -->
                <td class="px-6 py-4">
                  <?php if (!empty($app['photo']) && file_exists("../uploads/anchor_applications/" . $app['photo'])): ?>
                    <img src="../uploads/anchor_applications/<?= htmlspecialchars($app['photo']) ?>" class="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm cursor-pointer hover:scale-105 transition-transform view-photo" alt="Photo"/>
                  <?php else: ?>
                    <div class="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                      <i class="fa-solid fa-user-tie text-lg"></i>
                    </div>
                  <?php endif; ?>
                </td>

                <!-- Applicant Details -->
                <td class="px-6 py-4">
                  <div class="font-bold text-gray-900"><?= htmlspecialchars($app['name']) ?></div>
                  <div class="text-xs text-gray-500 mt-0.5 flex flex-col gap-0.5">
                    <span class="hover:text-brand-primary cursor-pointer"><i class="fa-solid fa-phone w-4"></i><?= htmlspecialchars($app['phone']) ?></span>
                    <span class="hover:text-brand-primary cursor-pointer"><i class="fa-solid fa-envelope w-4"></i><?= htmlspecialchars($app['email']) ?></span>
                  </div>
                </td>

                <!-- Education -->
                <td class="px-6 py-4 font-medium text-gray-700">
                  <?= htmlspecialchars($app['education']) ?>
                </td>

                <!-- Documents -->
                <td class="px-6 py-4">
                  <div class="flex gap-2">
                    <?php if (!empty($app['aadhaar']) && file_exists("../uploads/anchor_applications/" . $app['aadhaar'])): ?>
                      <a href="../uploads/anchor_applications/<?= htmlspecialchars($app['aadhaar']) ?>" target="_blank" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 flex items-center gap-1.5 transition">
                        <i class="fa-solid fa-id-card"></i> Aadhaar
                      </a>
                    <?php else: ?>
                      <span class="text-xs text-gray-400">No Aadhaar</span>
                    <?php endif; ?>

                    <?php if (!empty($app['resume']) && file_exists("../uploads/anchor_applications/" . $app['resume'])): ?>
                      <a href="../uploads/anchor_applications/<?= htmlspecialchars($app['resume']) ?>" target="_blank" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 flex items-center gap-1.5 transition">
                        <i class="fa-solid fa-file-invoice"></i> Resume
                      </a>
                    <?php else: ?>
                      <span class="text-xs text-gray-400">No Resume</span>
                    <?php endif; ?>
                  </div>
                </td>

                <!-- Date -->
                <td class="px-6 py-4 text-xs text-gray-500 font-medium">
                  <?= date("d M Y h:i A", strtotime($app['created_at'])) ?>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <?php 
                    $status = $app['status'];
                    if ($status === 'Approved') {
                        $badge = 'bg-green-50 text-green-700 border-green-200';
                    } elseif ($status === 'Rejected') {
                        $badge = 'bg-red-50 text-red-700 border-red-200';
                    } else {
                        $badge = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                    }
                  ?>
                  <span class="px-3 py-1 rounded-full text-xs font-bold border <?= $badge ?>"><?= $status ?></span>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4">
                  <form method="post" class="flex justify-center gap-2">
                    <input type="hidden" name="id" value="<?= $app['id'] ?>">
                    
                    <?php if ($status !== 'Approved'): ?>
                      <button type="submit" name="action" value="approve" class="w-9 h-9 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl border border-green-200 flex items-center justify-center transition shadow-sm" title="Approve">
                        <i class="fa-solid fa-check"></i>
                      </button>
                    <?php endif; ?>

                    <?php if ($status !== 'Rejected'): ?>
                      <button type="submit" name="action" value="reject" class="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 flex items-center justify-center transition shadow-sm" title="Reject">
                        <i class="fa-solid fa-ban"></i>
                      </button>
                    <?php endif; ?>

                    <?php if ($status !== 'Pending'): ?>
                      <button type="submit" name="action" value="pending" class="w-9 h-9 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-xl border border-yellow-200 flex items-center justify-center transition shadow-sm" title="Reset to Pending">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                      </button>
                    <?php endif; ?>
                  </form>
                </td>

              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
    </div><!-- /table scroll -->

    <!-- Mobile Cards View (shown only on mobile) -->
    <div class="sm:hidden space-y-3 p-4" id="appsCards">
      <?php foreach ($apps as $app): ?>
        <?php 
          $status = $app['status'];
          if ($status === 'Approved') {
              $badge = 'bg-green-50 text-green-700 border-green-200';
          } elseif ($status === 'Rejected') {
              $badge = 'bg-red-50 text-red-700 border-red-200';
          } else {
              $badge = 'bg-yellow-50 text-yellow-700 border-yellow-200';
          }
        ?>
        <div class="bg-white rounded-2xl shadow border border-slate-200 p-5 app-card transition" data-status="<?= htmlspecialchars($app['status']) ?>">
          
          <div class="flex justify-between items-start gap-3 mb-4">
            <div class="flex items-center gap-3">
              <?php if (!empty($app['photo']) && file_exists("../uploads/anchor_applications/" . $app['photo'])): ?>
                <img src="../uploads/anchor_applications/<?= htmlspecialchars($app['photo']) ?>" class="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm view-photo" alt="Photo"/>
              <?php else: ?>
                <div class="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                  <i class="fa-solid fa-user-tie text-2xl"></i>
                </div>
              <?php endif; ?>
              <div>
                <h3 class="font-bold text-gray-900 text-base leading-snug"><?= htmlspecialchars($app['name']) ?></h3>
                <p class="text-xs text-gray-500 mt-0.5"><?= htmlspecialchars($app['education']) ?></p>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xxs font-bold border <?= $badge ?>"><?= $status ?></span>
          </div>

          <div class="space-y-2 border-t border-gray-100 pt-3 mb-4">
            <div class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fa-solid fa-phone text-brand-primary w-4"></i>
              <span><?= htmlspecialchars($app['phone']) ?></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fa-solid fa-envelope text-brand-primary w-4"></i>
              <span><?= htmlspecialchars($app['email']) ?></span>
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-600">
              <i class="fa-solid fa-calendar-day text-brand-primary w-4"></i>
              <span><?= date("d M Y", strtotime($app['created_at'])) ?></span>
            </div>
          </div>

          <div class="flex gap-2 mb-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/50">
            <?php if (!empty($app['aadhaar']) && file_exists("../uploads/anchor_applications/" . $app['aadhaar'])): ?>
              <a href="../uploads/anchor_applications/<?= htmlspecialchars($app['aadhaar']) ?>" target="_blank" class="flex-1 text-center py-2 bg-white hover:bg-slate-50 border border-slate-200 text-blue-800 font-bold rounded-lg text-xs transition">
                <i class="fa-solid fa-id-card mr-1"></i> Aadhaar
              </a>
            <?php endif; ?>
            <?php if (!empty($app['resume']) && file_exists("../uploads/anchor_applications/" . $app['resume'])): ?>
              <a href="../uploads/anchor_applications/<?= htmlspecialchars($app['resume']) ?>" target="_blank" class="flex-1 text-center py-2 bg-white hover:bg-slate-50 border border-slate-200 text-blue-800 font-bold rounded-lg text-xs transition">
                <i class="fa-solid fa-file-invoice mr-1"></i> Resume
              </a>
            <?php endif; ?>
          </div>

          <form method="post" class="grid grid-cols-3 gap-2">
            <input type="hidden" name="id" value="<?= $app['id'] ?>">

            <button type="submit" name="action" value="approve" class="py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 <?= $status === 'Approved' ? 'opacity-30 cursor-not-allowed' : '' ?>" <?= $status === 'Approved' ? 'disabled' : '' ?>>
              <i class="fa-solid fa-check"></i> Approve
            </button>

            <button type="submit" name="action" value="reject" class="py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 <?= $status === 'Rejected' ? 'opacity-30 cursor-not-allowed' : '' ?>" <?= $status === 'Rejected' ? 'disabled' : '' ?>>
              <i class="fa-solid fa-ban"></i> Reject
            </button>

            <button type="submit" name="action" value="pending" class="py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 <?= $status === 'Pending' ? 'opacity-30 cursor-not-allowed' : '' ?>" <?= $status === 'Pending' ? 'disabled' : '' ?>>
              <i class="fa-solid fa-rotate-left"></i> Reset
            </button>
          </form>

        </div>
      <?php endforeach; ?>
    </div><!-- /appsCards -->

  <?php endif; ?>
  </div><!-- /premium-card -->

</main>

<!-- Photo Lightbox Modal -->
<div id="photoModal" class="admin-modal-overlay" onclick="if(this===event.target){closePhoto()}">
  <div class="relative max-w-lg max-h-[90vh] p-2" onclick="event.stopPropagation()">
    <img id="modalUserPhoto" class="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-slate-800 bg-slate-900/60 p-2" src=""/>
    <button onclick="closePhoto()" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition">
      <i class="fa-solid fa-xmark text-sm"></i>
    </button>
  </div>
</div>

<script>
// 1. Photo lightbox viewer logic
document.querySelectorAll(".view-photo").forEach(img => {
    img.onclick = () => {
        document.getElementById("modalUserPhoto").src = img.src;
        document.getElementById("photoModal").classList.add("active");
    };
});

const closePhoto = () => {
    document.getElementById("photoModal").classList.remove("active");
};

// 2. Tab Filter State
let currentTabFilter = 'all';

function filterStatus(status) {
    currentTabFilter = status;
    
    // Toggle active tab buttons colors
    document.querySelectorAll(".status-tab-btn").forEach(btn => {
        btn.className = "status-tab-btn flex-shrink-0 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition";
    });
    
    const activeBtn = document.getElementById("tab-" + status);
    if(activeBtn) {
        activeBtn.className = "status-tab-btn flex-shrink-0 px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm transition";
    }
    
    applyFilters();
}

// 3. Search and status filters application
const searchInput = document.getElementById('searchInput');

function applyFilters() {
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Desktop row filters
    document.querySelectorAll('#appsTable tbody .app-row').forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        const matchesStatus = (currentTabFilter === 'all' || rowStatus === currentTabFilter);
        const matchesSearch = row.innerText.toLowerCase().includes(searchVal);
        
        row.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
    });

    // Mobile card filters
    document.querySelectorAll('#appsCards .app-card').forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        const matchesStatus = (currentTabFilter === 'all' || cardStatus === currentTabFilter);
        const matchesSearch = card.innerText.toLowerCase().includes(searchVal);
        
        card.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
    });
}

if(searchInput) {
    searchInput.addEventListener('input', applyFilters);
}
</script>

</body>
</html>
