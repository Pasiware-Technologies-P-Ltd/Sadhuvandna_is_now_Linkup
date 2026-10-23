<?php
session_start();
include("../connection.php");

$page_limit = 20; // Kitne members ek baar mein load karne hain


// Handle Approve / Block
if(isset($_POST['action']) && isset($_POST['id'])){
    $id = intval($_POST['id']);
    $action = $_POST['action'];

    if($action === "approve"){
        $status = "Approved";
    } elseif($action === "block"){
        $status = "Blocked";
    } else {
        $_SESSION['msg'] = "Invalid action!";
        header("Location: admin_new_registration.php");
        exit;
    }

    $q = mysqli_query($con, "UPDATE tbl_members SET status='$status' WHERE id=$id");
    if($q){
        $_SESSION['msg'] = "Member $status successfully!";
    } else {
        $_SESSION['msg'] = "Database error!";
    }
    header("Location: admin_new_registration.php");
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
    
    $whereClause = "status='Pending'";
    if($search !== '') {
        $whereClause .= " AND (name LIKE '%$search%' OR email LIKE '%$search%' OR mobile LIKE '%$search%' OR cast LIKE '%$search%')";
    }
    
    $total_search_query = mysqli_query($con, "SELECT COUNT(*) as count FROM tbl_members WHERE $whereClause");
    $total_search_row = mysqli_fetch_assoc($total_search_query);
    $total_members = (int)($total_search_row['count'] ?? 0);
    
    $query = "SELECT * FROM tbl_members WHERE $whereClause ORDER BY date DESC, id DESC LIMIT $limit OFFSET $offset";
    $users_ajax = mysqli_query($con, $query);
    
    $desktop_html = '';
    $mobile_html = '';
    $a = $offset + 1;
    
    while($user = mysqli_fetch_assoc($users_ajax)){
        // Build Desktop HTML
        $photo_src = (!empty($user['profile_photo']) && file_exists("../uploads/photo/".$user['profile_photo'])) 
            ? "../uploads/photo/".$user['profile_photo'] 
            : "https://ui-avatars.com/api/?name=".urlencode($user['name'] ?: 'User')."&background=1877F2&color=ffffff&bold=true";

        $desktop_html .= '<tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
          <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold">'.$a.'</td>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-3">
              <div class="relative">
                <img src="'.$photo_src.'" class="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 shadow-sm cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src=\'https://ui-avatars.com/api/?name='.urlencode($user['name'] ?: 'User').'&background=2563EB&color=ffffff&bold=true\';">
              </div>
              <div class="min-w-0">
                <div class="font-bold text-slate-800 text-xs truncate max-w-[200px]" title="'.htmlspecialchars($user['name']).'">'.htmlspecialchars($user['name']).'</div>
                <div class="text-[11px] text-slate-400 font-medium">ID: #'.$user['id'].'</div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <div class="text-xs font-medium text-slate-700 truncate max-w-[230px]" title="'.htmlspecialchars($user['email']).'">'.htmlspecialchars($user['email']).'</div>
            <div class="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i> '.htmlspecialchars($user['mobile']).'
            </div>
          </td>
          <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">'.date("d M Y", strtotime($user['date'])).'</td>
          <td class="px-5 py-3.5">
            <span class="status-badge status-pending"><span class="status-badge-dot"></span> Pending</span>
          </td>
          <td class="px-5 py-3.5 text-center">
            <form method="post" class="flex justify-center gap-1.5">
              <input type="hidden" name="id" value="'.$user['id'].'">
              <button type="submit" name="action" value="approve" class="btn-action-icon btn-action-approve" title="Approve">
                <i class="fa-solid fa-check text-xs"></i>
              </button>
              <button type="submit" name="action" value="block" class="btn-action-icon btn-action-danger" title="Block">
                <i class="fa-solid fa-ban text-xs"></i>
              </button>
            </form>
          </td>
        </tr>';
        
        $cast_badge = !empty($user['cast']) ? '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60">'.htmlspecialchars($user['cast']).'</span>' : '';

        // Build Mobile HTML
        $mobile_html .= '<div class="premium-card p-4 user-card bg-white transition hover:shadow-md">
          <div class="flex items-start justify-between gap-2.5 mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <img src="'.$photo_src.'" class="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-xs cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src=\'https://ui-avatars.com/api/?name='.urlencode($user['name'] ?: 'User').'&background=2563eb&color=ffffff&bold=true\';">
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 truncate" title="'.htmlspecialchars($user['name']).'">'.htmlspecialchars($user['name']).'</h3>
                <div class="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
                  <span>ID: #'.$user['id'].'</span>
                  '.$cast_badge.'
                </div>
              </div>
            </div>
            <div class="flex-shrink-0">
              <span class="status-badge status-pending"><span class="status-badge-dot"></span> Pending</span>
            </div>
          </div>

          <div class="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 mb-3">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-envelope text-blue-500 w-4 text-center text-xs"></i>
              <span class="truncate font-medium text-slate-700">'.htmlspecialchars($user['email']).'</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-phone text-blue-500 w-4 text-center text-xs"></i>
              <a href="tel:'.htmlspecialchars($user['mobile']).'" class="font-medium text-slate-700 hover:text-blue-600">'.htmlspecialchars($user['mobile']).'</a>
            </div>
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-calendar-day text-blue-500 w-4 text-center text-xs"></i>
              <span class="font-medium text-slate-500">Joined: '.date("d M Y", strtotime($user['date'])).'</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <form method="post">
              <input type="hidden" name="id" value="'.$user['id'].'">
              <button type="submit" name="action" value="approve" class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition">
                <i class="fa-solid fa-check text-xs"></i> Approve
              </button>
            </form>
            <form method="post">
              <input type="hidden" name="id" value="'.$user['id'].'">
              <button type="submit" name="action" value="block" class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
                <i class="fa-solid fa-ban text-xs"></i> Block
              </button>
            </form>
          </div>
        </div>';

        $a++;
    }
    
    echo json_encode(['desktop' => $desktop_html, 'mobile' => $mobile_html, 'total' => $total_members], JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Fetch total count for display
$total_query = mysqli_query($con, "SELECT COUNT(*) as count FROM tbl_members WHERE status='Pending'");
$total_row = mysqli_fetch_assoc($total_query);
$total_members = $total_row['count'];

// Initial Load
$users = mysqli_query($con, "SELECT * FROM tbl_members WHERE status='Pending' ORDER BY date DESC LIMIT $page_limit");
?>

<?php include("header.php"); ?>

<main class="w-full px-3 sm:px-5 lg:px-6 py-2">

<?php if(isset($_SESSION['msg'])): ?>
<div class="mb-2 p-1.5 bg-green-100 text-green-800 rounded-lg text-sm text-center font-semibold border border-green-300">
  <?= $_SESSION['msg']; unset($_SESSION['msg']); ?>
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
          New Registrations
        </h2>
        <p class="text-xs text-slate-400">Review and verify pending member join requests</p>
      </div>
    </div>
    
    <div class="page-subheader-right">
      <div class="subheader-search">
        <i class="fa-solid fa-search subheader-search-icon"></i>
        <input 
          type="search" 
          id="searchInput" 
          placeholder="Search pending members..."
        >
      </div>
      <div class="premium-counter-pill">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        Pending: <span class="text-amber-600 font-bold" id="pending-count"><?= number_format($total_members) ?></span>
      </div>
    </div>
  </div>
</div>

<!-- Desktop Table Container -->
<div class="hidden md:block premium-card overflow-hidden">
  <div class="overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
    <table class="w-full text-sm" id="userTable">
      <thead class="sticky top-0 z-10 shadow-xs">
        <tr class="bg-slate-50/95 backdrop-blur border-b border-slate-200">
          <th class="premium-th w-12">#</th>
          <th class="premium-th">Member</th>
          <th class="premium-th">Contact Info</th>
          <th class="premium-th">Joined</th>
          <th class="premium-th">Status</th>
          <th class="premium-th text-center w-28">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php $a=1; while($user = mysqli_fetch_assoc($users)): 
          $photo_src = (!empty($user['profile_photo']) && file_exists("../uploads/photo/".$user['profile_photo'])) 
              ? "../uploads/photo/".$user['profile_photo'] 
              : "https://ui-avatars.com/api/?name=".urlencode($user['name'] ?: 'User')."&background=2563EB&color=ffffff&bold=true";
        ?>
        <tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
          <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $a;?></td>
          <td class="px-5 py-3.5">
            <div class="flex items-center gap-3">
              <div class="relative">
                <img src="<?= $photo_src ?>" class="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 shadow-sm cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=<?= urlencode($user['name'] ?: 'User') ?>&background=2563EB&color=ffffff&bold=true';">
              </div>
              <div class="min-w-0">
                <div class="font-bold text-slate-800 text-xs truncate max-w-[200px]" title="<?= htmlspecialchars($user['name']) ?>"><?= htmlspecialchars($user['name']) ?></div>
                <div class="text-[11px] text-slate-400 font-medium">ID: #<?= $user['id'] ?></div>
              </div>
            </div>
          </td>
          <td class="px-5 py-3.5">
            <div class="text-xs font-medium text-slate-700 truncate max-w-[230px]" title="<?= htmlspecialchars($user['email']) ?>"><?= htmlspecialchars($user['email']) ?></div>
            <div class="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i> <?= htmlspecialchars($user['mobile']) ?>
            </div>
          </td>
          <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap"><?= date("d M Y", strtotime($user['date'])) ?></td>
          <td class="px-5 py-3.5">
            <span class="status-badge status-pending">
              <span class="status-badge-dot"></span> Pending
            </span>
          </td>
          <td class="px-5 py-3.5 text-center">
            <form method="post" class="flex justify-center gap-1.5">
              <input type="hidden" name="id" value="<?= $user['id'] ?>">
              <button type="submit" name="action" value="approve" class="btn-action-icon btn-action-approve" title="Approve">
                <i class="fa-solid fa-check text-xs"></i>
              </button>
              <button type="submit" name="action" value="block" class="btn-action-icon btn-action-danger" title="Block">
                <i class="fa-solid fa-ban text-xs"></i>
              </button>
            </form>
          </td>
        </tr>
        <?php $a++; endwhile; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Mobile Cards -->
<div class="md:hidden space-y-3 mt-4" id="userCards">
<?php
// Initial load for mobile view
$users = mysqli_query($con, "SELECT * FROM tbl_members WHERE status='Pending' ORDER BY date DESC LIMIT $page_limit");
while($user = mysqli_fetch_assoc($users)):
  $photo_src = (!empty($user['profile_photo']) && file_exists("../uploads/photo/".$user['profile_photo'])) 
      ? "../uploads/photo/".$user['profile_photo'] 
      : "https://ui-avatars.com/api/?name=".urlencode($user['name'] ?: 'User')."&background=2563eb&color=ffffff&bold=true";
  $cast_badge = !empty($user['cast']) ? '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200/60">'.htmlspecialchars($user['cast']).'</span>' : '';
?>
<div class="premium-card p-4 user-card bg-white transition hover:shadow-md">
  <div class="flex items-start justify-between gap-2.5 mb-3">
    <div class="flex items-center gap-3 min-w-0">
      <img src="<?= $photo_src ?>" class="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-xs cursor-pointer view-photo flex-shrink-0" alt="photo" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=<?= urlencode($user['name'] ?: 'User') ?>&background=2563eb&color=ffffff&bold=true';">
      <div class="min-w-0">
        <h3 class="text-sm font-bold text-slate-900 truncate" title="<?= htmlspecialchars($user['name']) ?>"><?= htmlspecialchars($user['name']) ?></h3>
        <div class="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
          <span>ID: #<?= $user['id'] ?></span>
          <?= $cast_badge ?>
        </div>
      </div>
    </div>
    <div class="flex-shrink-0">
      <span class="status-badge status-pending"><span class="status-badge-dot"></span> Pending</span>
    </div>
  </div>

  <div class="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 mb-3">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-envelope text-blue-500 w-4 text-center text-xs"></i>
      <span class="truncate font-medium text-slate-700"><?= htmlspecialchars($user['email']) ?></span>
    </div>
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-phone text-blue-500 w-4 text-center text-xs"></i>
      <a href="tel:<?= htmlspecialchars($user['mobile']) ?>" class="font-medium text-slate-700 hover:text-blue-600"><?= htmlspecialchars($user['mobile']) ?></a>
    </div>
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-calendar-day text-blue-500 w-4 text-center text-xs"></i>
      <span class="font-medium text-slate-500">Joined: <?= date("d M Y", strtotime($user['date'])) ?></span>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
    <form method="post">
      <input type="hidden" name="id" value="<?= $user['id'] ?>">
      <button type="submit" name="action" value="approve" class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition">
        <i class="fa-solid fa-check text-xs"></i> Approve
      </button>
    </form>
    <form method="post">
      <input type="hidden" name="id" value="<?= $user['id'] ?>">
      <button type="submit" name="action" value="block" class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition">
        <i class="fa-solid fa-ban text-xs"></i> Block
      </button>
    </form>
  </div>
</div>
<?php endwhile; ?>
</div>

<!-- Image Modal -->
<div id="photoModal" class="fixed inset-0 bg-black bg-opacity-80 hidden items-center justify-center z-50">
    <span id="closePhotoModal" class="absolute top-5 right-5 text-white text-3xl cursor-pointer">&times;</span>
    <img id="modalUserPhoto" class="max-h-full max-w-full rounded-lg shadow-lg" />
</div>

<script>
// Event Delegation for Image modal
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
    if(e.target === document.getElementById("photoModal")){
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
    
    const tbody = document.querySelector('#userTable tbody');
    const userCards = document.getElementById('userCards');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-xs text-slate-400 font-medium"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching pending members...</td></tr>';
    if (userCards) userCards.innerHTML = '<div class="text-center py-6 text-xs text-slate-400 font-medium"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching pending members...</div>';
    
    loadMore(true);
}

if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchDebounceTimer);
            performSearch();
        }
    });

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
    const targetUrl = `${window.location.pathname}?ajax=1&page=${nextPage}&search=${encodeURIComponent(currentSearch)}`;
    
    fetch(targetUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(data => {
        const tbody = document.querySelector('#userTable tbody');
        const userCards = document.getElementById('userCards');
        
        if (isSearch) {
            if (tbody) tbody.innerHTML = '';
            if (userCards) userCards.innerHTML = '';
        }
        
        const hasDesktopData = data.desktop && data.desktop.trim() !== '';
        const hasMobileData = data.mobile && data.mobile.trim() !== '';
        
        if (!hasDesktopData && !hasMobileData) {
            hasMore = false;
            if (isSearch) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-xs text-slate-400 font-medium"><i class="fa-solid fa-user-slash text-slate-300 text-2xl block mb-2"></i>No pending registrations found</td></tr>';
                if (userCards) userCards.innerHTML = '<div class="text-center py-10 text-xs text-slate-400 font-medium">No pending registrations found.</div>';
            }
        } else {
            currentPage = nextPage;
            if (tbody && hasDesktopData) {
                tbody.insertAdjacentHTML('beforeend', data.desktop);
            }
            if (userCards && hasMobileData) {
                userCards.insertAdjacentHTML('beforeend', data.mobile);
            }
        }
        
        if (data.total !== undefined) {
            const countEl = document.getElementById('pending-count');
            if (countEl) countEl.innerText = Number(data.total).toLocaleString();
        }
        
        loading = false;
        
        // Auto-load if no scrollbar
        if (tableContainer && tableContainer.scrollHeight <= tableContainer.clientHeight + 50 && hasMore) {
            loadMore();
        }
    })
    .catch(err => {
        console.error("Chunk loading error:", err);
        loading = false;
        if (isSearch) {
            const tbody = document.querySelector('#userTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-xs text-rose-500 font-medium">Failed to search. Please check network.</td></tr>';
        }
    });
}
</script>

</body>
</html>

