<?php
session_start();
include("../connection.php"); // header.php shouldn't be included here, it needs connection

$page_limit = 20; // Kitne members/reports ek baar mein load karne hain


// Ensure tbl_reports table exists
$createTableQuery = "CREATE TABLE IF NOT EXISTS `tbl_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reason` text,
  `date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
mysqli_query($con, $createTableQuery);

// Ensure tbl_posts has is_suspended column
$checkColumn = mysqli_query($con, "SHOW COLUMNS FROM tbl_posts LIKE 'is_suspended'");
if (mysqli_num_rows($checkColumn) == 0) {
    mysqli_query($con, "ALTER TABLE tbl_posts ADD COLUMN is_suspended TINYINT(1) DEFAULT 0 AFTER media");
}

// Handle Suspend/Activate
if (isset($_POST['action']) && isset($_POST['post_id'])) {
    $post_id = intval($_POST['post_id']);
    $action = $_POST['action'];

    if ($action === "suspend") {
        $q = mysqli_query($con, "UPDATE tbl_posts SET is_suspended = 1 WHERE id=$post_id");
        if ($q) $_SESSION['msg'] = "Post suspended successfully!";
        else $_SESSION['msg'] = "Database error!";
    } elseif ($action === "activate") {
        $q = mysqli_query($con, "UPDATE tbl_posts SET is_suspended = 0 WHERE id=$post_id");
        if ($q) $_SESSION['msg'] = "Post activated successfully!";
        else $_SESSION['msg'] = "Database error!";
    }
    header("Location: admin_reported_posts.php");
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
    
    $whereClause = "1=1";
    if($search !== '') {
        $whereClause .= " AND (p.status LIKE '%$search%' OR m_poster.name LIKE '%$search%' OR m_reporter.name LIKE '%$search%')";
    }
    
    $countQuery = "
        SELECT COUNT(*) as count 
        FROM tbl_reports r
        JOIN tbl_posts p ON r.post_id = p.id
        JOIN tbl_members m_poster ON p.user_id = m_poster.id
        JOIN tbl_members m_reporter ON r.user_id = m_reporter.id
        WHERE $whereClause
    ";
    $total_search_query = mysqli_query($con, $countQuery);
    $total_search_row = mysqli_fetch_assoc($total_search_query);
    $total_reports = $total_search_row['count'];
    
    $dataQuery = "
        SELECT 
            r.id AS report_id, 
            r.reason, 
            r.date AS report_date, 
            p.id AS post_id, 
            p.status AS post_text, 
            p.media, 
            p.is_suspended, 
            m_poster.name AS poster_name, 
            m_reporter.name AS reporter_name 
        FROM tbl_reports r
        JOIN tbl_posts p ON r.post_id = p.id
        JOIN tbl_members m_poster ON p.user_id = m_poster.id
        JOIN tbl_members m_reporter ON r.user_id = m_reporter.id
        WHERE $whereClause
        ORDER BY r.date DESC 
        LIMIT $limit OFFSET $offset
    ";
    $reports_ajax = mysqli_query($con, $dataQuery);
    
    $desktop_html = '';
    $mobile_html = '';
    
    while($row = mysqli_fetch_assoc($reports_ajax)){
        
        $media_html = '';
        if(!empty($row['media'])){
            $media_html .= '<div class="flex gap-2 flex-wrap mt-2">';
            $mediaFiles = explode(',', $row['media']);
            foreach($mediaFiles as $mediaFile){
                $mediaFile = trim($mediaFile);
                $mediaPath = "../uploads/posts/" . $mediaFile;
                if(preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $mediaFile)){
                    $media_html .= '<div class="w-16 h-16 rounded overflow-hidden border cursor-pointer hover:opacity-80 transition" onclick="openMediaModal(\''.$mediaPath.'\', \'image\')">
                        <img src="'.$mediaPath.'" class="w-full h-full object-cover">
                      </div>';
                } elseif(preg_match('/\.(mp4|webm|ogg)$/i', $mediaFile)){
                    $media_html .= '<div class="w-16 h-16 bg-black rounded flex items-center justify-center border text-white text-xs cursor-pointer hover:bg-gray-800 transition" onclick="openMediaModal(\''.$mediaPath.'\', \'video\')">
                        <i class="fa-solid fa-play text-xl"></i>
                      </div>';
                }
            }
            $media_html .= '</div>';
        }
        
        $see_more = '';
        if(strlen($row['post_text']) > 100){
            $see_more = '<button type="button" onclick="toggleDescription(\'desc-'.$row['post_id'].'-'.$row['report_id'].'\', this)" class="text-brand-primary text-xs font-bold hover:underline mb-2">See More</button>';
        }

        $status_html = '';
        if($row['is_suspended'] == 1){
            $status_html = '<span class="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 shadow-sm">
                   <i class="fa-solid fa-ban"></i> Suspended
                 </span>';
        } else {
            $status_html = '<span class="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 shadow-sm">
                   <i class="fa-solid fa-check-circle"></i> Active
                 </span>';
        }

        $action_html = '';
        if($row['is_suspended'] == 1){
            $action_html = '<input type="hidden" name="action" value="activate">
                    <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all w-full flex items-center justify-center gap-2">
                       <i class="fa-solid fa-check"></i> Activate
                    </button>';
        } else {
            $action_html = '<input type="hidden" name="action" value="suspend">
                    <button type="submit" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all w-full flex items-center justify-center gap-2">
                       <i class="fa-solid fa-ban"></i> Suspend
                    </button>';
        }

        $desktop_html .= '<tr class="hover:bg-slate-50/50 transition-colors report-row">
            <!-- Report Info -->
            <td class="py-4 px-6 align-top">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-bold text-gray-800"><i class="fa-solid fa-user-shield text-brand-primary mr-1"></i> '.htmlspecialchars($row['reporter_name']).'</span>
                <span class="text-xs text-gray-500">Reported <span class="font-bold text-brand-primary">'.htmlspecialchars($row['poster_name']).'</span>\'s post</span>
                <span class="text-xs text-gray-400"><i class="fa-regular fa-clock"></i> '.date("d M Y, h:i A", strtotime($row['report_date'])).'</span>
                <div class="mt-2 bg-red-50 p-2 rounded border border-red-100 text-sm text-red-800">
                  <span class="font-bold">Reason:</span> '.nl2br(htmlspecialchars($row['reason'])).'
                </div>
              </div>
            </td>

            <!-- Post Content -->
            <td class="py-4 px-6 align-top">
              <div class="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <p class="mb-2 whitespace-pre-wrap line-clamp-2 text-[13px]" id="desc-'.$row['post_id'].'-'.$row['report_id'].'">'.htmlspecialchars($row['post_text']).'</p>
                '.$see_more.'
                '.$media_html.'
              </div>
            </td>

            <!-- Status -->
            <td class="py-4 px-6 text-center align-top">
               '.$status_html.'
            </td>

            <!-- Actions -->
            <td class="py-4 px-6 text-center align-top">
               <form method="POST" onsubmit="return confirm(\'Are you sure you want to change the status of this post?\');">
                 <input type="hidden" name="post_id" value="'.$row['post_id'].'">
                 '.$action_html.'
               </form>
            </td>
          </tr>';

        // Mobile Card HTML
        $mobile_html .= '<div class="premium-card p-4 mobile-card bg-white transition hover:shadow-md border border-slate-200 report-card">
            <div class="flex items-start justify-between gap-2.5 mb-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  <i class="fa-solid fa-flag"></i>
                </div>
                <div class="min-w-0">
                  <h4 class="text-xs font-bold text-slate-800 truncate">'.htmlspecialchars($row['reporter_name']).'</h4>
                  <p class="text-[11px] text-slate-400">Reported <span class="font-semibold text-brand-primary">'.htmlspecialchars($row['poster_name']).'</span></p>
                </div>
              </div>
              <div class="flex-shrink-0">
                '.$status_html.'
              </div>
            </div>

            <div class="text-[11px] text-slate-400 mb-2">
              <i class="fa-regular fa-clock"></i> '.date("d M Y, h:i A", strtotime($row['report_date'])).'
            </div>

            <div class="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 text-xs text-rose-800 mb-3">
              <span class="font-bold">Reason:</span> '.nl2br(htmlspecialchars($row['reason'])).'
            </div>

            <div class="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200 mb-3">
              <p class="mb-2 whitespace-pre-wrap line-clamp-2 text-[13px]" id="m-desc-'.$row['post_id'].'-'.$row['report_id'].'">'.htmlspecialchars($row['post_text']).'</p>
              '.(strlen($row['post_text']) > 100 ? '<button type="button" onclick="toggleDescription(\'m-desc-'.$row['post_id'].'-'.$row['report_id'].'\', this)" class="text-brand-primary text-xs font-bold hover:underline mb-2">See More</button>' : '').'
              '.$media_html.'
            </div>

            <form method="POST" onsubmit="return confirm(\'Are you sure you want to change the status of this post?\');">
              <input type="hidden" name="post_id" value="'.$row['post_id'].'">
              '.$action_html.'
            </form>
          </div>';
    }
    
    echo json_encode(['desktop' => $desktop_html, 'mobile' => $mobile_html, 'total' => $total_reports], JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Fetch total count for display
$total_query = mysqli_query($con, "SELECT COUNT(*) as count FROM tbl_reports");
$total_row = mysqli_fetch_assoc($total_query);
$total_reports = $total_row['count'];

// Initial Load
$reportsQuery = "
    SELECT 
        r.id AS report_id, 
        r.reason, 
        r.date AS report_date, 
        p.id AS post_id, 
        p.status AS post_text, 
        p.media, 
        p.is_suspended, 
        m_poster.name AS poster_name, 
        m_reporter.name AS reporter_name 
    FROM tbl_reports r
    JOIN tbl_posts p ON r.post_id = p.id
    JOIN tbl_members m_poster ON p.user_id = m_poster.id
    JOIN tbl_members m_reporter ON r.user_id = m_reporter.id
    ORDER BY r.date DESC 
    LIMIT $page_limit
";
$reports = mysqli_query($con, $reportsQuery);
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

<!-- TOP TITLE -->
<!-- <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
  <div class="flex items-center gap-3">
    <a href="index.php" class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center hover:bg-blue-100 transition shadow-sm">
      <i class="fa-solid fa-arrow-left text-brand-primary"></i>
    </a>
    <div>
      <h1 class="text-xl md:text-2xl font-bold text-gray-800">Reported Posts</h1>
      <p class="text-xs text-gray-500">Manage user reports and moderate content</p>
    </div>
  </div> -->
</div>
  <?php if(isset($_SESSION['msg'])): ?>
    <div class="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center justify-between text-xs shadow-sm">
       <span><i class="fa-solid fa-circle-check mr-2"></i> <?= $_SESSION['msg'] ?></span>
       <button onclick="this.parentElement.style.display='none'" class="text-emerald-600 hover:text-emerald-800"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <?php unset($_SESSION['msg']); ?>
  <?php endif; ?>

  <!-- Premium Card Wrapper -->
  <div class="premium-card overflow-hidden">
    <!-- Sub-Header / Action Bar -->
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="index.php" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900">Reported Posts</h2>
          <p class="text-xs text-slate-400 font-medium">Review user reports and moderate community content</p>
        </div>
      </div>
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input type="text" id="searchInput" placeholder="Search posts, users...">
        </div>
        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          Reports: <span class="text-rose-600 font-bold" id="totalReportsCount"><?= $total_reports ?></span>
        </div>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block table-container p-0 overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <?php if(mysqli_num_rows($reports) > 0): ?>
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-100 sticky top-0 z-10 shadow-sm">
          <tr>
            <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Report Info</th>
            <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Post Content</th>
            <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
            <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100" id="tableBody">
          <?php while($row = mysqli_fetch_assoc($reports)): ?>
          <tr class="hover:bg-slate-50/50 transition-colors report-row">
            
            <!-- Report Info -->
            <td class="py-4 px-6 align-top">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-bold text-gray-800"><i class="fa-solid fa-user-shield text-brand-primary mr-1"></i> <?= htmlspecialchars($row['reporter_name']) ?></span>
                <span class="text-xs text-gray-500">Reported <span class="font-bold text-brand-primary"><?= htmlspecialchars($row['poster_name']) ?></span>'s post</span>
                <span class="text-xs text-gray-400"><i class="fa-regular fa-clock"></i> <?= date("d M Y, h:i A", strtotime($row['report_date'])) ?></span>
                <div class="mt-2 bg-red-50 p-2 rounded border border-red-100 text-sm text-red-800">
                  <span class="font-bold">Reason:</span> <?= nl2br(htmlspecialchars($row['reason'])) ?>
                </div>
              </div>
            </td>

            <!-- Post Content -->
            <td class="py-4 px-6 align-top">
              <div class="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <p class="mb-2 whitespace-pre-wrap line-clamp-2 text-[13px]" id="desc-<?= $row['post_id'] ?>-<?= $row['report_id'] ?>"><?= htmlspecialchars($row['post_text']) ?></p>
                <?php if(strlen($row['post_text']) > 100): ?>
                  <button type="button" onclick="toggleDescription('desc-<?= $row['post_id'] ?>-<?= $row['report_id'] ?>', this)" class="text-brand-primary text-xs font-bold hover:underline mb-2">See More</button>
                <?php endif; ?>
                
                <?php if(!empty($row['media'])): ?>
                  <div class="flex gap-2 flex-wrap mt-2">
                    <?php 
                      $mediaFiles = explode(',', $row['media']);
                      foreach($mediaFiles as $mediaFile): 
                        $mediaFile = trim($mediaFile);
                        $mediaPath = "../uploads/posts/" . $mediaFile;
                        if(preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $mediaFile)):
                    ?>
                      <div class="w-16 h-16 rounded overflow-hidden border cursor-pointer hover:opacity-80 transition" onclick="openMediaModal('<?= $mediaPath ?>', 'image')">
                        <img src="<?= $mediaPath ?>" class="w-full h-full object-cover">
                      </div>
                    <?php elseif(preg_match('/\.(mp4|webm|ogg)$/i', $mediaFile)): ?>
                      <div class="w-16 h-16 bg-black rounded flex items-center justify-center border text-white text-xs cursor-pointer hover:bg-gray-800 transition" onclick="openMediaModal('<?= $mediaPath ?>', 'video')">
                        <i class="fa-solid fa-play text-xl"></i>
                      </div>
                    <?php endif; endforeach; ?>
                  </div>
                <?php endif; ?>
              </div>
            </td>

            <!-- Status -->
            <td class="py-4 px-6 text-center align-top">
               <?php if($row['is_suspended'] == 1): ?>
                 <span class="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 shadow-sm">
                   <i class="fa-solid fa-ban"></i> Suspended
                 </span>
               <?php else: ?>
                 <span class="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 shadow-sm">
                   <i class="fa-solid fa-check-circle"></i> Active
                 </span>
               <?php endif; ?>
            </td>

            <!-- Actions -->
            <td class="py-4 px-6 text-center align-top">
               <form method="POST" onsubmit="return confirm('Are you sure you want to change the status of this post?');">
                 <input type="hidden" name="post_id" value="<?= $row['post_id'] ?>">
                 <?php if($row['is_suspended'] == 1): ?>
                    <input type="hidden" name="action" value="activate">
                    <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all w-full flex items-center justify-center gap-2">
                       <i class="fa-solid fa-check"></i> Activate
                    </button>
                 <?php else: ?>
                    <input type="hidden" name="action" value="suspend">
                    <button type="submit" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all w-full flex items-center justify-center gap-2">
                       <i class="fa-solid fa-ban"></i> Suspend
                    </button>
                 <?php endif; ?>
               </form>
            </td>

          </tr>
          <?php endwhile; ?>
        </tbody>
      </table>
      <?php else: ?>
         <div class="p-12 text-center flex flex-col items-center">
            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
               <i class="fa-solid fa-folder-open text-3xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-700 mb-2">No Reports Found</h3>
            <p class="text-gray-500">There are currently no reported posts to review.</p>
         </div>
      <?php endif; ?>
    </div><!-- /tableScrollContainer -->

    <!-- Mobile Cards View (sm:hidden) -->
    <div class="sm:hidden space-y-3 p-4" id="mobileCards">
      <?php 
      if(mysqli_num_rows($reports) > 0) {
        mysqli_data_seek($reports, 0);
        while($row = mysqli_fetch_assoc($reports)): 
      ?>
      <div class="premium-card p-4 mobile-card bg-white transition hover:shadow-md border border-slate-200 report-card">
        <div class="flex items-start justify-between gap-2.5 mb-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
              <i class="fa-solid fa-flag"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-800 truncate"><?= htmlspecialchars($row['reporter_name']) ?></h4>
              <p class="text-[11px] text-slate-400">Reported <span class="font-semibold text-brand-primary"><?= htmlspecialchars($row['poster_name']) ?></span></p>
            </div>
          </div>
          <div class="flex-shrink-0">
            <?php if($row['is_suspended'] == 1): ?>
              <span class="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xxs font-bold border border-red-200 shadow-xs">
                <i class="fa-solid fa-ban"></i> Suspended
              </span>
            <?php else: ?>
              <span class="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xxs font-bold border border-green-200 shadow-xs">
                <i class="fa-solid fa-check-circle"></i> Active
              </span>
            <?php endif; ?>
          </div>
        </div>

        <div class="text-[11px] text-slate-400 mb-2">
          <i class="fa-regular fa-clock"></i> <?= date("d M Y, h:i A", strtotime($row['report_date'])) ?>
        </div>

        <div class="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100 text-xs text-rose-800 mb-3">
          <span class="font-bold">Reason:</span> <?= nl2br(htmlspecialchars($row['reason'])) ?>
        </div>

        <div class="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200 mb-3">
          <p class="mb-2 whitespace-pre-wrap line-clamp-2 text-[13px]" id="m-desc-<?= $row['post_id'] ?>-<?= $row['report_id'] ?>"><?= htmlspecialchars($row['post_text']) ?></p>
          <?php if(strlen($row['post_text']) > 100): ?>
            <button type="button" onclick="toggleDescription('m-desc-<?= $row['post_id'] ?>-<?= $row['report_id'] ?>', this)" class="text-brand-primary text-xs font-bold hover:underline mb-2">See More</button>
          <?php endif; ?>
          
          <?php if(!empty($row['media'])): ?>
            <div class="flex gap-2 flex-wrap mt-2">
              <?php 
                $mediaFiles = explode(',', $row['media']);
                foreach($mediaFiles as $mediaFile): 
                  $mediaFile = trim($mediaFile);
                  $mediaPath = "../uploads/posts/" . $mediaFile;
                  if(preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $mediaFile)):
              ?>
                <div class="w-14 h-14 rounded overflow-hidden border cursor-pointer hover:opacity-80 transition" onclick="openMediaModal('<?= $mediaPath ?>', 'image')">
                  <img src="<?= $mediaPath ?>" class="w-full h-full object-cover">
                </div>
              <?php elseif(preg_match('/\.(mp4|webm|ogg)$/i', $mediaFile)): ?>
                <div class="w-14 h-14 bg-black rounded flex items-center justify-center border text-white text-xs cursor-pointer hover:bg-gray-800 transition" onclick="openMediaModal('<?= $mediaPath ?>', 'video')">
                  <i class="fa-solid fa-play text-lg"></i>
                </div>
              <?php endif; endforeach; ?>
            </div>
          <?php endif; ?>
        </div>

        <form method="POST" onsubmit="return confirm('Are you sure you want to change the status of this post?');">
          <input type="hidden" name="post_id" value="<?= $row['post_id'] ?>">
          <?php if($row['is_suspended'] == 1): ?>
             <input type="hidden" name="action" value="activate">
             <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all w-full flex items-center justify-center gap-2">
                <i class="fa-solid fa-check"></i> Activate Post
             </button>
          <?php else: ?>
             <input type="hidden" name="action" value="suspend">
             <button type="submit" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all w-full flex items-center justify-center gap-2">
                <i class="fa-solid fa-ban"></i> Suspend Post
             </button>
          <?php endif; ?>
        </form>
      </div>
      <?php endwhile; } else { ?>
        <div class="p-8 text-center text-slate-400 text-xs">No reports found.</div>
      <?php } ?>
    </div><!-- /mobileCards -->
  </div><!-- /premium-card -->
</main>

<!-- MEDIA MODAL -->
<div id="mediaModal" class="fixed inset-0 z-[100] bg-black/90 hidden flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
  <button onclick="closeMediaModal()" class="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-brand-primary bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition-all z-10">
    <i class="fa-solid fa-xmark text-xl"></i>
  </button>
  <div class="max-w-4xl w-full max-h-[90vh] flex items-center justify-center relative">
    <div id="mediaModalContent" class="w-full flex justify-center"></div>
  </div>
</div>

<script>
function toggleDescription(id, btn) {
    const el = document.getElementById(id);
    if (el.classList.contains('line-clamp-2')) {
        el.classList.remove('line-clamp-2');
        btn.innerText = 'See Less';
    } else {
        el.classList.add('line-clamp-2');
        btn.innerText = 'See More';
    }
}

function openMediaModal(src, type) {
    const modal = document.getElementById('mediaModal');
    const content = document.getElementById('mediaModalContent');
    
    if (type === 'image') {
        content.innerHTML = `<img src="${src}" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl">`;
    } else if (type === 'video') {
        content.innerHTML = `<video src="${src}" controls autoplay class="max-w-full max-h-[85vh] rounded-lg shadow-2xl outline-none"></video>`;
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeMediaModal() {
    const modal = document.getElementById('mediaModal');
    const content = document.getElementById('mediaModalContent');
    modal.classList.add('hidden');
    content.innerHTML = '';
    document.body.style.overflow = '';
}

// Close modal on escape key or clicking outside
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMediaModal();
});
document.getElementById('mediaModal').addEventListener('click', function(e) {
    if (e.target === this) closeMediaModal();
});

// Server-side Live search & Infinite Scroll Logic
let currentPage = 1;
let loading = false;
let hasMore = true;
let currentSearch = '';

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          currentSearch = searchInput.value.trim();
          currentPage = 1;
          hasMore = true;
          document.querySelector('#tableBody').innerHTML = '';
          loadMore(true);
      }
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
            if((!data.desktop || data.desktop.trim() === '') && (!data.mobile || data.mobile.trim() === '')) {
                hasMore = false;
            } else {
                const mobileCardsEl = document.getElementById('mobileCards');
                if (isSearch) {
                    if (document.querySelector('#tableBody')) document.querySelector('#tableBody').innerHTML = data.desktop || '';
                    if (mobileCardsEl) mobileCardsEl.innerHTML = data.mobile || '<div class="p-8 text-center text-slate-400 text-xs">No reports found.</div>';
                } else {
                    if (document.querySelector('#tableBody') && data.desktop) document.querySelector('#tableBody').insertAdjacentHTML('beforeend', data.desktop);
                    if (mobileCardsEl && data.mobile) mobileCardsEl.insertAdjacentHTML('beforeend', data.mobile);
                }
            }
            
            if (data.total !== undefined) {
                const countEl = document.getElementById('totalReportsCount');
                if (countEl) countEl.innerText = data.total;
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
            console.error('Error loading reports:', err);
            loading = false;
        });
}
</script>

</body>
</html>
