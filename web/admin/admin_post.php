<?php
session_start();
include("../connection.php");

$page_limit = 20;


/* DELETE POST */
if (isset($_POST['action'], $_POST['id']) && $_POST['action'] === "delete") {
    $id = intval($_POST['id']);

    $q = mysqli_query($con, "SELECT media FROM tbl_posts WHERE id=$id");
    if ($row = mysqli_fetch_assoc($q)) {
        if ($row['media'] && file_exists("../uploads/posts/" . $row['media'])) {
            unlink("../uploads/posts/" . $row['media']);
        }
    }

    mysqli_query($con, "DELETE FROM tbl_posts WHERE id=$id");
    $_SESSION['msg'] = "Post deleted successfully!";
    header("Location: admin_post");
    exit;
}

// Handle AJAX Request for Infinite Scroll
if(isset($_GET['ajax']) && $_GET['ajax'] == 1) {
    if (ob_get_length()) ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    
    $limit = $page_limit;
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($page - 1) * $limit;
    
    $search = isset($_GET['search']) ? mysqli_real_escape_string($con, $_GET['search']) : '';
    
    $whereClause = "";
    if($search !== '') {
        $whereClause = " WHERE p.status LIKE '%$search%' OR m.name LIKE '%$search%' OR m.mobile LIKE '%$search%' ";
    }
    
    $total_q = mysqli_query($con, "SELECT COUNT(*) as cnt FROM tbl_posts p LEFT JOIN tbl_members m ON m.id = p.user_id $whereClause");
    $total_row = mysqli_fetch_assoc($total_q);
    $total_posts = $total_row['cnt'];
    
    $posts = mysqli_query($con, "
    SELECT p.*, m.name, m.mobile
    FROM tbl_posts p
    LEFT JOIN tbl_members m ON m.id = p.user_id
    $whereClause
    ORDER BY p.created_at DESC
    LIMIT $limit OFFSET $offset
    ");
    
    $desktop_html = '';
    $mobile_html = '';
    $i = $offset + 1;
    
    while($p = mysqli_fetch_assoc($posts)) {
        // Desktop HTML
        $mediaHtml = '';
        if($p['media']){
            if(preg_match('/mp4|webm|ogg/i',$p['media'])){
                $mediaHtml = '<video src="../uploads/posts/'.$p['media'].'" class="w-28 rounded cursor-pointer view-video" muted></video>';
            }else{
                $mediaHtml = '<img src="../uploads/posts/'.$p['media'].'" class="w-20 rounded cursor-pointer view-img">';
            }
        }
        $linkHtml = $p['link'] ? '<a href="'.$p['link'].'" target="_blank" class="text-blue-600 underline">Open</a>' : '';
        $dateHtml = date("d M Y",strtotime($p['created_at']));
        $name = htmlspecialchars($p['name'] ?? 'Unknown');
        $mobile = htmlspecialchars($p['mobile'] ?? '-');
        $status = htmlspecialchars($p['status']);
        $id = $p['id'];
        
        $desktop_html .= '<tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
        <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold">'.$i.'</td>
        <td class="px-5 py-3.5"><div class="font-bold text-slate-800 text-xs">'.$name.'</div><div class="text-[11px] text-slate-400 font-medium">'.$mobile.'</div></td>
        <td class="px-5 py-3.5 text-xs text-slate-700 font-medium max-w-[280px]"><div class="line-clamp-2" title="'.$status.'">'.$status.'</div></td>
        <td class="px-5 py-3.5">'.($mediaHtml ?: '<span class="text-xs text-slate-400 font-medium italic">No media</span>').'</td>
        <td class="px-5 py-3.5 text-xs">'.($linkHtml ?: '<span class="text-slate-300">-</span>').'</td>
        <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">'.$dateHtml.'</td>
        <td class="px-5 py-3.5 text-center">
        <form method="post" onsubmit="return confirm(\'Delete this post?\')">
        <input type="hidden" name="id" value="'.$id.'">
        <button name="action" value="delete" class="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition inline-flex items-center justify-center cursor-pointer" title="Delete Post"><i class="fa-solid fa-trash text-xs"></i></button>
        </form>
        </td>
        </tr>';
        
        // Mobile HTML
        $mobile_media_html = '';
        if($p['media']){
            if(preg_match('/mp4|webm|ogg/i',$p['media'])){
                $mobile_media_html = '<div class="relative rounded-xl overflow-hidden mb-3 bg-slate-900 border border-slate-200">
                  <video src="../uploads/posts/'.$p['media'].'" class="w-full max-h-64 object-cover cursor-pointer view-video" muted></video>
                  <div class="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <i class="fa-solid fa-video text-[10px]"></i> Video
                  </div>
                </div>';
            }else{
                $mobile_media_html = '<div class="rounded-xl overflow-hidden mb-3 border border-slate-200">
                  <img src="../uploads/posts/'.$p['media'].'" class="w-full max-h-64 object-cover cursor-pointer view-img hover:scale-102 transition">
                </div>';
            }
        }

        $mobile_link_html = !empty($p['link']) ? '<div class="mb-3"><a href="'.htmlspecialchars($p['link']).'" target="_blank" class="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 break-all"><i class="fa-solid fa-link text-[10px]"></i> '.htmlspecialchars($p['link']).'</a></div>' : '';

        $mobile_html .= '<div class="premium-card p-4 mobile-card bg-white transition hover:shadow-md">
          <div class="flex items-start justify-between gap-2.5 mb-2.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
                <i class="fa-solid fa-user"></i>
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 truncate">'.$name.'</h3>
                <p class="text-[11px] text-slate-400 font-medium">'.$mobile.'</p>
              </div>
            </div>
            <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap">'.$dateHtml.'</span>
          </div>

          <p class="text-xs text-slate-700 leading-relaxed mb-3 break-words whitespace-pre-wrap">'.$status.'</p>

          '.$mobile_media_html.'
          '.$mobile_link_html.'

          <form method="post" onsubmit="return confirm(\'Delete this post?\')" class="pt-2 border-t border-slate-100">
            <input type="hidden" name="id" value="'.$id.'">
            <button name="action" value="delete" class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer">
              <i class="fa-solid fa-trash text-xs"></i> Delete Post
            </button>
          </form>
        </div>';
        $i++;
    }
    
    echo json_encode(['desktop' => $desktop_html, 'mobile' => $mobile_html, 'total' => $total_posts], JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Fetch total count for display
$total_q = mysqli_query($con, "SELECT COUNT(*) as cnt FROM tbl_posts");
$total_row = mysqli_fetch_assoc($total_q);
$total_posts = $total_row['cnt'];

// Initial Load
$posts = mysqli_query($con, "
    SELECT p.*, m.name, m.mobile
    FROM tbl_posts p
    LEFT JOIN tbl_members m ON m.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT $page_limit
");
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-4">

<?php if(isset($_SESSION['msg'])): ?>
<div class="mb-2 p-1 bg-green-100 text-green-700 rounded text-sm text-center font-semibold border border-green-300">
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
          Community Feed Posts
        </h2>
        <p class="text-xs text-slate-400">Moderate live community posts, media attachments and updates</p>
      </div>
    </div>
    
    <div class="page-subheader-right">
      <div class="subheader-search">
        <i class="fa-solid fa-search subheader-search-icon"></i>
        <input 
          type="search" 
          id="searchInput"
          placeholder="Search member or content..."
        >
      </div>
      <div class="premium-counter-pill">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        Total: <span id="totalPostsCount" class="text-blue-600 font-bold"><?= number_format($total_posts) ?></span>
      </div>
    </div>
  </div>
</div>

<!-- Desktop Table Container -->
<div class="hidden md:block premium-card overflow-hidden">
  <div class="overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
    <table class="w-full text-sm">
      <thead class="sticky top-0 z-20 shadow-xs">
        <tr class="bg-slate-50/95 backdrop-blur border-b border-slate-200">
  <th class="premium-th w-12">#</th>
  <th class="premium-th">Author</th>
  <th class="premium-th">Content / Caption</th>
  <th class="premium-th">Media</th>
  <th class="premium-th">External Link</th>
  <th class="premium-th">Posted On</th>
  <th class="premium-th text-center w-24">Action</th>
</tr>
</thead>
<tbody id="tableBody" class="divide-y divide-slate-100">
<?php $i=1; while($p=mysqli_fetch_assoc($posts)): ?>
<tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
<td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $i ?></td>

<td class="px-5 py-3.5">
  <div class="font-bold text-slate-800 text-xs"><?= htmlspecialchars($p['name'] ?? 'Unknown') ?></div>
  <div class="text-[11px] text-slate-400 font-medium"><?= htmlspecialchars($p['mobile'] ?? '-') ?></div>
</td>

<td class="px-5 py-3.5 text-xs text-slate-700 font-medium max-w-[280px]">
  <div class="line-clamp-2" title="<?= htmlspecialchars($p['status']) ?>"><?= htmlspecialchars($p['status']) ?></div>
</td>

<td class="px-5 py-3.5">
<?php if($p['media']): ?>
<?php if(preg_match('/mp4|webm|ogg/i',$p['media'])): ?>
<video src="../uploads/posts/<?= $p['media'] ?>" class="w-20 h-14 rounded-lg object-cover ring-1 ring-slate-200 cursor-pointer view-video" muted></video>
<?php else: ?>
<img src="../uploads/posts/<?= $p['media'] ?>" class="w-16 h-12 rounded-lg object-cover ring-1 ring-slate-200 cursor-pointer view-img shadow-2xs" alt="post media">
<?php endif; ?>
<?php else: ?>
<span class="text-xs text-slate-400 font-medium italic">No media</span>
<?php endif; ?>
</td>

<td class="px-5 py-3.5 text-xs">
<?php if($p['link']): ?>
<a href="<?= $p['link'] ?>" target="_blank" class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline">
  <span>Link</span> <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
</a>
<?php else: ?>
<span class="text-slate-300">-</span>
<?php endif; ?>
</td>

<td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap"><?= date("d M Y",strtotime($p['created_at'])) ?></td>

<td class="px-5 py-3.5 text-center">
<form method="post" onsubmit="return confirm('Delete this post?')">
<input type="hidden" name="id" value="<?= $p['id'] ?>">
<button name="action" value="delete" class="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition inline-flex items-center justify-center cursor-pointer" title="Delete Post">
<i class="fa-solid fa-trash text-xs"></i>
</button>
</form>
</td>
</tr>
<?php $i++; endwhile; ?>
</tbody>
</table>
</div>
</div>

<!-- MOBILE CARDS -->
<div class="md:hidden space-y-4" id="mobileCards">
<?php
$posts = mysqli_query($con, "
    SELECT p.*, m.name, m.mobile
    FROM tbl_posts p
    LEFT JOIN tbl_members m ON m.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT $page_limit
");
while($p=mysqli_fetch_assoc($posts)): 
  $id = $p['id'];
  $name = htmlspecialchars($p['name'] ?? 'Unknown User');
  $mobile = htmlspecialchars($p['mobile'] ?? '-');
  $status = htmlspecialchars($p['status'] ?? '');
  $dateFormatted = date('d M Y, h:i A', strtotime($p['created_at']));
?>
<div class="premium-card p-4 mobile-card bg-white transition hover:shadow-md">
  <div class="flex items-start justify-between gap-2.5 mb-2.5">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
        <i class="fa-solid fa-user"></i>
      </div>
      <div class="min-w-0">
        <h3 class="text-sm font-bold text-slate-900 truncate"><?= $name ?></h3>
        <p class="text-[11px] text-slate-400 font-medium"><?= $mobile ?></p>
      </div>
    </div>
    <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap"><?= $dateFormatted ?></span>
  </div>

  <p class="text-xs text-slate-700 leading-relaxed mb-3 break-words whitespace-pre-wrap"><?= $status ?></p>

  <?php if(!empty($p['media'])): ?>
    <?php if(preg_match('/mp4|webm|ogg/i', $p['media'])): ?>
      <div class="relative rounded-xl overflow-hidden mb-3 bg-slate-900 border border-slate-200">
        <video src="../uploads/posts/<?= $p['media'] ?>" class="w-full max-h-64 object-cover cursor-pointer view-video" muted></video>
        <div class="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
          <i class="fa-solid fa-video text-[10px]"></i> Video
        </div>
      </div>
    <?php else: ?>
      <div class="rounded-xl overflow-hidden mb-3 border border-slate-200">
        <img src="../uploads/posts/<?= $p['media'] ?>" class="w-full max-h-64 object-cover cursor-pointer view-img hover:scale-102 transition">
      </div>
    <?php endif; ?>
  <?php endif; ?>

  <?php if(!empty($p['link'])): ?>
    <div class="mb-3">
      <a href="<?= htmlspecialchars($p['link']) ?>" target="_blank" class="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 break-all">
        <i class="fa-solid fa-link text-[10px]"></i> <?= htmlspecialchars($p['link']) ?>
      </a>
    </div>
  <?php endif; ?>

  <form method="post" onsubmit="return confirm('Delete this post?')" class="pt-2 border-t border-slate-100">
    <input type="hidden" name="id" value="<?= $id ?>">
    <button name="action" value="delete" class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer">
      <i class="fa-solid fa-trash text-xs"></i> Delete Post
    </button>
  </form>
</div>
<?php endwhile; ?>
</div>



</main>

<!-- MEDIA MODAL -->
<div id="mediaModal" class="fixed inset-0 bg-black bg-opacity-90 hidden items-center justify-center z-50">
<span id="closeMediaModal" class="absolute top-5 right-6 text-white text-3xl cursor-pointer">&times;</span>
<img id="modalImg" class="hidden max-w-full max-h-full rounded">
<video id="modalVideo" class="hidden max-w-full max-h-full rounded" controls></video>
</div>

<script>
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
    
    const tbody = document.querySelector('#tableBody');
    const mobileCards = document.getElementById('mobileCards');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-xs text-slate-400 font-medium"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching posts...</td></tr>';
    if (mobileCards) mobileCards.innerHTML = '<div class="text-center py-6 text-xs text-slate-400 font-medium"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching posts...</div>';
    
    loadMore(true);
}

if(searchInput) {
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
    
    // Check desktop container
    if (tableContainer && window.innerWidth >= 768) {
        if (Math.ceil(tableContainer.scrollTop + tableContainer.clientHeight) >= tableContainer.scrollHeight - 250) {
            loadMore();
            return;
        }
    }
    
    // Check mobile or window scroll
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    if (Math.ceil(window.innerHeight + scrollY) >= document.documentElement.scrollHeight - 350) {
        loadMore();
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
            if (!res.ok) throw new Error('Network response was not ok: ' + res.status);
            return res.json();
        })
        .then(data => {
            if (!isSearch) {
                currentPage = nextPage;
            }
            if(!data.desktop || (data.desktop.trim() === '' && (!data.mobile || data.mobile.trim() === ''))) {
                hasMore = false;
            } else {
                if (isSearch) {
                    document.querySelector('#tableBody').innerHTML = data.desktop;
                    document.getElementById('mobileCards').innerHTML = data.mobile;
                } else {
                    document.querySelector('#tableBody').insertAdjacentHTML('beforeend', data.desktop);
                    document.getElementById('mobileCards').insertAdjacentHTML('beforeend', data.mobile);
                }
            }
            
            if (data.total !== undefined) {
                const totalEl = document.getElementById('totalPostsCount');
                if (totalEl) totalEl.innerText = data.total;
            }
            
            loading = false;
            
            // Auto-load next chunk if page content doesn't fill viewport
            setTimeout(() => {
                if (hasMore && (
                    (tableContainer && tableContainer.scrollHeight <= tableContainer.clientHeight + 100) ||
                    (document.documentElement.scrollHeight <= window.innerHeight + 100)
                )) {
                    loadMore();
                }
            }, 100);
        })
        .catch(err => {
            console.error('Error loading posts:', err);
            loading = false;
        });
}

// MEDIA MODAL
const modal=document.getElementById("mediaModal"),
img=document.getElementById("modalImg"),
vid=document.getElementById("modalVideo"),
close=document.getElementById("closeMediaModal");

document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('view-img')) {
        vid.pause(); vid.classList.add("hidden"); 
        img.src = e.target.src; img.classList.remove("hidden");
        modal.classList.add("flex"); modal.classList.remove("hidden");
    } else if (e.target.classList.contains('view-video')) {
        img.classList.add("hidden"); 
        vid.src = e.target.src; vid.classList.remove("hidden"); vid.play();
        modal.classList.add("flex"); modal.classList.remove("hidden");
    }
});

close.onclick=()=>{vid.pause();vid.src="";modal.classList.add("hidden");modal.classList.remove("flex");};
modal.onclick=e=>{if(e.target===modal)close.click();};
</script>

</body>
</html>

