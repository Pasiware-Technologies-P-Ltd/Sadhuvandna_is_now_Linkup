<?php
session_start();
include("../connection.php");

$page_limit = 20; // Kitne members ek baar mein load karne hain


// Handle Block (approved members ko block karne ke liye)
if(isset($_POST['action']) && isset($_POST['id'])){
    $id = intval($_POST['id']);
    $action = $_POST['action'];

    if($action === "block"){
        $status = "Blocked";
        $q = mysqli_query($con, "UPDATE tbl_members SET status='$status' WHERE id=$id");
        if($q){
            $_SESSION['msg'] = "Member blocked successfully!";
        } else {
            $_SESSION['msg'] = "Database error!";
        }
    }
    header("Location: admin_all_community_member.php");
    exit;
}

// Handle AJAX Request for Infinite Scroll
if(isset($_GET['ajax']) && $_GET['ajax'] == 1) {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json; charset=utf-8');

    $limit = $page_limit;
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $offset = ($page - 1) * $limit;
    
    $search = isset($_GET['search']) ? mysqli_real_escape_string($con, $_GET['search']) : '';
    
    $whereClause = "status='Approved'";
    if($search !== '') {
        $whereClause .= " AND (name LIKE '%$search%' OR email LIKE '%$search%' OR mobile LIKE '%$search%' OR cast LIKE '%$search%')";
    }
    
    $total_search_query = mysqli_query($con, "SELECT COUNT(*) as count FROM tbl_members WHERE $whereClause");
    $total_search_row = mysqli_fetch_assoc($total_search_query);
    $total_members = (int)($total_search_row['count'] ?? 0);
    
    $query = "SELECT * FROM tbl_members WHERE $whereClause ORDER BY date DESC, id DESC LIMIT $limit OFFSET $offset";
    $members_ajax = mysqli_query($con, $query);
    
    $desktop_html = '';
    $mobile_html = '';
    $a = $offset + 1;
    
    while($m = mysqli_fetch_assoc($members_ajax)){
        // Build Desktop HTML
        $status_html = '';
        if($m['status']=="Pending"){
            $status_html = '<span class="status-badge status-pending"><span class="status-badge-dot"></span> Pending</span>';
        } elseif($m['status']=="Approved") {
            $status_html = '<span class="status-badge status-active"><span class="status-badge-dot"></span> Active</span>';
        } else {
            $status_html = '<span class="status-badge status-blocked"><span class="status-badge-dot"></span> Blocked</span>';
        }
        
        $action_html = '';
        if($m['status']=="Pending"){
            $action_html = '<form method="post" class="flex justify-center gap-1.5">
              <input type="hidden" name="id" value="'.$m['id'].'">
              <button type="submit" name="action" value="approve" class="btn-action-icon btn-action-approve" title="Approve">
                <i class="fa-solid fa-check text-xs"></i>
              </button>
              <button type="submit" name="action" value="block" class="btn-action-icon btn-action-danger" title="Block">
                <i class="fa-solid fa-ban text-xs"></i>
              </button>
            </form>';
        } elseif($m['status']=="Approved"){
            $action_html = '<form method="post" class="flex justify-center">
                <input type="hidden" name="id" value="'.$m['id'].'">
                <button type="submit" name="action" value="block" class="btn-action-icon btn-action-danger" title="Block Member">
                  <i class="fa-solid fa-ban text-xs"></i>
                </button>
              </form>';
        }
        
        $photo_src = (!empty($m['profile_photo']) && file_exists("../uploads/photo/".$m['profile_photo'])) 
            ? "../uploads/photo/".$m['profile_photo'] 
            : "https://ui-avatars.com/api/?name=".urlencode($m['name'] ?: 'User')."&background=2563EB&color=ffffff&bold=true";

        $desktop_html .= '<tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
          <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold">'.$a.'</td>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-3">
              <div class="relative">
                <img src="'.$photo_src.'" class="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 shadow-sm cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src=\'https://ui-avatars.com/api/?name='.urlencode($m['name'] ?: 'User').'&background=2563EB&color=ffffff&bold=true\';">
              </div>
              <div class="min-w-0">
                <div class="font-bold text-slate-800 text-xs truncate max-w-[200px]" title="'.htmlspecialchars($m['name']).'">'.htmlspecialchars($m['name']).'</div>
                <div class="text-[11px] text-slate-400 font-medium">ID: #'.$m['id'].'</div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <div class="text-xs font-medium text-slate-700 truncate max-w-[230px]" title="'.htmlspecialchars($m['email']).'">'.htmlspecialchars($m['email']).'</div>
            <div class="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i> '.htmlspecialchars($m['mobile']).'
            </div>
          </td>
          <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">'.date("d M Y", strtotime($m['date'])).'</td>
          <td class="px-5 py-3.5">'.$status_html.'</td>
          <td class="px-5 py-3.5 text-center">'.$action_html.'</td>
        </tr>';
        
        $status_badge_html = '<span class="status-badge status-active"><span class="status-badge-dot"></span> Active</span>';
        if($m['status'] == "Pending") $status_badge_html = '<span class="status-badge status-pending"><span class="status-badge-dot"></span> Pending</span>';
        if($m['status'] == "Blocked") $status_badge_html = '<span class="status-badge status-blocked"><span class="status-badge-dot"></span> Blocked</span>';

        $mobile_action_html = '';
        if($m['status']=="Pending"){
            $mobile_action_html = '<form method="post" class="flex gap-2 w-full mt-3 pt-3 border-t border-slate-100">
              <input type="hidden" name="id" value="'.$m['id'].'">
              <button type="submit" name="action" value="approve" class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition">
                <i class="fa-solid fa-check text-xs"></i> Approve
              </button>
              <button type="submit" name="action" value="block" class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
                <i class="fa-solid fa-ban text-xs"></i> Block
              </button>
            </form>';
        } elseif($m['status']=="Approved"){
            $mobile_action_html = '<form method="post" class="w-full mt-3 pt-3 border-t border-slate-100">
                <input type="hidden" name="id" value="'.$m['id'].'">
                <button type="submit" name="action" value="block" class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
                  <i class="fa-solid fa-ban text-xs"></i> Block Member
                </button>
              </form>';
        }
        
        $cast_badge = !empty($m['cast']) ? '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60">'.htmlspecialchars($m['cast']).'</span>' : '';

        $mobile_html .= '<div class="premium-card p-3.5 user-card bg-white border border-slate-200/80 rounded-xl shadow-2xs transition hover:shadow-xs">
          <div class="flex items-start justify-between gap-2.5 mb-2.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="'.$photo_src.'" class="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src=\'https://ui-avatars.com/api/?name='.urlencode($m['name'] ?: 'User').'&background=2563eb&color=ffffff&bold=true\';">
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 truncate" title="'.htmlspecialchars($m['name']).'">'.htmlspecialchars($m['name']).'</h3>
                <div class="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
                  <span>ID: #'.$m['id'].'</span>
                  '.$cast_badge.'
                </div>
              </div>
            </div>
            <div class="flex-shrink-0">
              '.$status_badge_html.'
            </div>
          </div>

          <div class="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-envelope text-blue-500 w-4 text-center text-xs"></i>
              <span class="truncate font-medium text-slate-700">'.htmlspecialchars($m['email']).'</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-phone text-blue-500 w-4 text-center text-xs"></i>
              <a href="tel:'.htmlspecialchars($m['mobile']).'" class="font-medium text-slate-700 hover:text-blue-600">'.htmlspecialchars($m['mobile']).'</a>
            </div>
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-calendar-day text-blue-500 w-4 text-center text-xs"></i>
              <span class="font-medium text-slate-500">Joined: '.date("d M Y", strtotime($m['date'])).'</span>
            </div>
          </div>

          '.$mobile_action_html.'
        </div>';
        
        $a++;
    }
    
    echo json_encode(['desktop' => $desktop_html, 'mobile' => $mobile_html, 'total' => $total_members], JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Fetch total count for display
$total_query = mysqli_query($con, "SELECT COUNT(*) as count FROM tbl_members WHERE status='Approved'");
$total_row = mysqli_fetch_assoc($total_query);
$total_members = $total_row['count'];

// Fetch only approved members (Initial Load - First 20)
$members = mysqli_query($con, "SELECT * FROM tbl_members WHERE status='Approved' ORDER BY date DESC LIMIT $page_limit");
?>


<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-4">

<?php if(isset($_SESSION['msg'])): ?>
<div class="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-semibold border border-emerald-200 flex items-center gap-2">
  <i class="fa-solid fa-circle-check text-emerald-600"></i>
  <span><?= $_SESSION['msg']; unset($_SESSION['msg']); ?></span>
</div>
<?php endif; ?>

<!-- Table Sub-Header / Filters (Visible on BOTH Mobile & Desktop) -->
<div class="premium-card overflow-hidden mb-5">
  <div class="page-subheader">
    <div class="page-subheader-left">
      <a href="index.php" class="btn-back-nav" title="Back to Dashboard">
        <i class="fa-solid fa-arrow-left text-xs"></i>
      </a>
      <div>
        <h2 class="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          Community Members
        </h2>
        <p class="text-xs text-slate-400">All registered & active accounts</p>
      </div>
    </div>
    
    <div class="page-subheader-right">
      <div class="subheader-search">
        <i class="fa-solid fa-search subheader-search-icon"></i>
        <input 
          type="search" 
          id="searchInput" 
          placeholder="Search by name, phone, email..."
        >
      </div>
      <div class="premium-counter-pill">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        Total: <span id="totalMembersCount" class="text-blue-600 font-bold"><?= number_format($total_members) ?></span>
      </div>
    </div>
  </div>

  <!-- Desktop Table Container -->
  <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
    <table class="w-full text-left border-collapse" id="memberTable">
      <thead class="sticky top-0 z-10">
        <tr class="bg-slate-50">
          <th class="premium-th px-5 py-3 w-14">#</th>
          <th class="premium-th px-5 py-3">Member</th>
          <th class="premium-th px-5 py-3">Contact Info</th>
          <th class="premium-th px-5 py-3">Joined Date</th>
          <th class="premium-th px-5 py-3">Status</th>
          <th class="premium-th px-5 py-3 text-center w-24">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100" id="tableBody">
        <?php $a=1; while($m = mysqli_fetch_assoc($members)): 
          $photo_src = (!empty($m['profile_photo']) && file_exists("../uploads/photo/".$m['profile_photo'])) 
              ? "../uploads/photo/".$m['profile_photo'] 
              : "https://ui-avatars.com/api/?name=".urlencode($m['name'] ?: 'User')."&background=2563eb&color=ffffff&bold=true";
        ?>
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $a;?></td>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-3">
              <img src="<?= $photo_src ?>" class="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=<?= urlencode($m['name'] ?: 'User') ?>&background=2563eb&color=ffffff&bold=true';">
              <div class="min-w-0">
                <div class="font-bold text-slate-900 text-sm truncate max-w-[210px]" title="<?= htmlspecialchars($m['name']) ?>"><?= htmlspecialchars($m['name']) ?></div>
                <div class="text-[11px] text-slate-400 font-medium">ID: #<?= $m['id'] ?></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <div class="text-xs font-medium text-slate-700 truncate max-w-[230px]" title="<?= htmlspecialchars($m['email']) ?>"><?= htmlspecialchars($m['email']) ?></div>
            <div class="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i> <?= htmlspecialchars($m['mobile']) ?>
            </div>
          </td>
          <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap"><?= date("d M Y", strtotime($m['date'])) ?></td>
          <td class="px-5 py-3.5">
            <?php if($m['status']=="Pending"): ?>
              <span class="status-badge status-pending">
                <span class="status-badge-dot"></span> Pending
              </span>
            <?php elseif($m['status']=="Approved"): ?>
              <span class="status-badge status-active">
                <span class="status-badge-dot"></span> Active
              </span>
            <?php else: ?>
              <span class="status-badge status-blocked">
                <span class="status-badge-dot"></span> Blocked
              </span>
            <?php endif; ?>
          </td>
          <td class="px-5 py-3.5 text-center">
            <?php if($m['status']=="Pending"): ?>
            <form method="post" class="flex justify-center gap-1.5">
              <input type="hidden" name="id" value="<?= $m['id'] ?>">
              <button type="submit" name="action" value="approve" class="btn-action-icon btn-action-approve" title="Approve">
                <i class="fa-solid fa-check text-xs"></i>
              </button>
              <button type="submit" name="action" value="block" class="btn-action-icon btn-action-danger" title="Block">
                <i class="fa-solid fa-ban text-xs"></i>
              </button>
            </form>
            <?php elseif($m['status']=="Approved"): ?>
              <form method="post" class="flex justify-center">
                <input type="hidden" name="id" value="<?= $m['id'] ?>">
                <button type="submit" name="action" value="block" class="btn-action-icon btn-action-danger" title="Block Member">
                  <i class="fa-solid fa-ban text-xs"></i>
                </button>
              </form>
            <?php endif; ?>
          </td>
        </tr>
        <?php $a++; endwhile; ?>
      </tbody>
    </table>
  </div>

  <!-- Mobile Card View: Nested cleanly inside outer premium-card -->
  <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="mobileCards">
  <?php
  // Initial load for mobile view (First 20)
  $members = mysqli_query($con, "SELECT * FROM tbl_members WHERE status='Approved' ORDER BY date DESC LIMIT $page_limit");
  while($m = mysqli_fetch_assoc($members)):
    $photo_src = (!empty($m['profile_photo']) && file_exists("../uploads/photo/".$m['profile_photo'])) 
        ? "../uploads/photo/".$m['profile_photo'] 
        : "https://ui-avatars.com/api/?name=".urlencode($m['name'] ?: 'User')."&background=2563eb&color=ffffff&bold=true";
  ?>
  <div class="premium-card p-3.5 user-card bg-white border border-slate-200/80 rounded-xl shadow-2xs transition hover:shadow-xs">
    <div class="flex items-start justify-between gap-2.5 mb-2.5">
      <div class="flex items-center gap-2.5 min-w-0">
        <img src="<?= $photo_src ?>" class="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=<?= urlencode($m['name'] ?: 'User') ?>&background=2563eb&color=ffffff&bold=true';">
        <div class="min-w-0">
          <h3 class="text-xs font-bold text-slate-900 truncate" title="<?= htmlspecialchars($m['name']) ?>"><?= htmlspecialchars($m['name']) ?></h3>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
            <span>ID: #<?= $m['id'] ?></span>
            <?php if(!empty($m['cast'])): ?>
              <span class="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200/60"><?= htmlspecialchars($m['cast']) ?></span>
            <?php endif; ?>
          </div>
        </div>
      </div>
      <div class="flex-shrink-0">
        <?php if($m['status']=="Pending"): ?>
          <span class="status-badge status-pending text-[10px]"><span class="status-badge-dot"></span> Pending</span>
        <?php elseif($m['status']=="Approved"): ?>
          <span class="status-badge status-active text-[10px]"><span class="status-badge-dot"></span> Active</span>
        <?php else: ?>
          <span class="status-badge status-blocked text-[10px]"><span class="status-badge-dot"></span> Blocked</span>
        <?php endif; ?>
      </div>
    </div>

    <div class="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-envelope text-blue-500 w-4 text-center text-xs"></i>
        <span class="truncate font-medium text-slate-700 text-[11px]"><?= htmlspecialchars($m['email']) ?></span>
      </div>
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-phone text-blue-500 w-4 text-center text-xs"></i>
        <a href="tel:<?= htmlspecialchars($m['mobile']) ?>" class="font-medium text-slate-700 text-[11px] hover:text-blue-600"><?= htmlspecialchars($m['mobile']) ?></a>
      </div>
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-calendar-day text-blue-500 w-4 text-center text-xs"></i>
        <span class="font-medium text-slate-500 text-[11px]">Joined: <?= date("d M Y", strtotime($m['date'])) ?></span>
      </div>
    </div>

    <?php if($m['status']=="Pending"): ?>
      <form method="post" class="flex gap-2 w-full mt-2.5 pt-2.5 border-t border-slate-100">
        <input type="hidden" name="id" value="<?= $m['id'] ?>">
        <button type="submit" name="action" value="approve" class="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition">
          <i class="fa-solid fa-check text-xs"></i> Approve
        </button>
        <button type="submit" name="action" value="block" class="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
          <i class="fa-solid fa-ban text-xs"></i> Block
        </button>
      </form>
    <?php elseif($m['status']=="Approved"): ?>
      <form method="post" class="w-full mt-2.5 pt-2.5 border-t border-slate-100">
        <input type="hidden" name="id" value="<?= $m['id'] ?>">
        <button type="submit" name="action" value="block" class="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
          <i class="fa-solid fa-ban text-xs"></i> Block Member
        </button>
      </form>
    <?php endif; ?>
  </div>
  <?php endwhile; ?>
  </div>

</div>

<!-- Photo Modal -->
<div id="photoModal" class="fixed inset-0 bg-black bg-opacity-80 hidden items-center justify-center z-50">
  <span id="closePhotoModal" class="absolute top-5 right-5 text-white text-3xl cursor-pointer">&times;</span>
  <img id="modalUserPhoto" class="max-h-full max-w-full rounded-lg shadow-lg"/>
</div>

<script>
// Event Delegation for Image modal to work with dynamically loaded content
document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-photo')) {
        document.getElementById("modalUserPhoto").src = e.target.src;
        document.getElementById("photoModal").classList.remove("hidden");
        document.getElementById("photoModal").classList.add("flex");
    }
});

document.getElementById("closePhotoModal").onclick = () => {
  document.getElementById("photoModal").classList.add("hidden");
  document.getElementById("photoModal").classList.remove("flex");
};

document.getElementById("photoModal").onclick = e => {
  if (e.target === document.getElementById("photoModal")) {
    document.getElementById("photoModal").classList.add("hidden");
    document.getElementById("photoModal").classList.remove("flex");
  }
};

// Server-side Live search & Infinite Scroll Logic
let currentPage = 1;
let loading = false;
let hasMore = true;
let currentSearch = '';
let searchDebounceTimer = null;

const searchInput = document.getElementById('searchInput');

function performSearch() {
    const val = searchInput ? searchInput.value.trim() : '';
    currentSearch = val;
    currentPage = 1;
    hasMore = true;
    loading = false;
    
    // Clear existing rows
    const tbody = document.querySelector('#memberTable tbody');
    const mobileCards = document.getElementById('mobileCards');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-xs text-slate-400 font-medium"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching...</td></tr>';
    if (mobileCards) mobileCards.innerHTML = '<div class="text-center py-6 text-xs text-slate-400 font-medium"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching...</div>';
    
    loadMore(true);
}

if (searchInput) {
    // Instant Enter key support
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchDebounceTimer);
            performSearch();
        }
    });

    // Live typing with smooth 350ms debounce
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            performSearch();
        }, 350);
    });
}

const tableContainer = document.getElementById('tableScrollContainer');

function checkScrollAndLoad() {
    if (loading || !hasMore) return;
    
    // Check desktop table scroll
    if (tableContainer && window.innerWidth >= 768) {
        if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 250) {
            loadMore();
        }
    } else {
        // Mobile window scroll
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        if (window.innerHeight + scrollY >= document.documentElement.scrollHeight - 350) {
            loadMore();
        }
    }
}

if (tableContainer) {
    tableContainer.addEventListener('scroll', checkScrollAndLoad);
}
window.addEventListener('scroll', checkScrollAndLoad);

function loadMore(isSearch = false) {
    if (loading || (!hasMore && !isSearch)) return;
    loading = true;
    
    const nextPage = isSearch ? 1 : (currentPage + 1);
    
    // Use window.location.pathname so it works identically on localhost and production (whether using .php or clean URL without .php)
    const targetUrl = `${window.location.pathname}?ajax=1&page=${nextPage}&search=${encodeURIComponent(currentSearch)}`;
    
    fetch(targetUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(data => {
        const tbody = document.querySelector('#memberTable tbody');
        const mobileContainer = document.getElementById('mobileCards');
        
        if (isSearch) {
            if (tbody) tbody.innerHTML = '';
            if (mobileContainer) mobileContainer.innerHTML = '';
        }
        
        const hasDesktopData = data.desktop && data.desktop.trim() !== '';
        const hasMobileData = data.mobile && data.mobile.trim() !== '';
        
        if (!hasDesktopData && !hasMobileData) {
            hasMore = false;
            if (isSearch) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-xs text-slate-400 font-medium"><i class="fa-solid fa-user-slash text-slate-300 text-2xl block mb-2"></i>No members found matching "' + encodeURIComponent(currentSearch).replace(/%20/g, ' ') + '"</td></tr>';
                if (mobileContainer) mobileContainer.innerHTML = '<div class="text-center py-10 text-xs text-slate-400 font-medium">No members found matching your search.</div>';
            }
        } else {
            currentPage = nextPage;
            if (tbody && hasDesktopData) {
                tbody.insertAdjacentHTML('beforeend', data.desktop);
            }
            if (mobileContainer && hasMobileData) {
                mobileContainer.insertAdjacentHTML('beforeend', data.mobile);
            }
        }
        
        if (data.total !== undefined) {
            const totalEl = document.getElementById('totalMembersCount');
            if (totalEl) totalEl.innerText = Number(data.total).toLocaleString();
        }
        
        loading = false;
        
        // If content loaded doesn't fill the visible container yet, load next chunk
        if (tableContainer && tableContainer.scrollHeight <= tableContainer.clientHeight + 50 && hasMore) {
            loadMore();
        }
    })
    .catch(err => {
        console.error("Chunk loading error:", err);
        loading = false;
        if (isSearch) {
            const tbody = document.querySelector('#memberTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-xs text-rose-500 font-medium">Failed to search. Please check network.</td></tr>';
        }
    });
}
</script>

</body>
</html>

