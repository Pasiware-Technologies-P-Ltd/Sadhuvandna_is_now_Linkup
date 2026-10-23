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

// Auto-create breaking news table if it doesn't exist
mysqli_query($con, "CREATE TABLE IF NOT EXISTS `tbl_breaking_news` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` text NOT NULL,
  `posted_by` varchar(50) DEFAULT 'Admin',
  `poster_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

/* -----------------------------
   INSERT NEWS (MULTIPLE IMAGE)
------------------------------ */
if(isset($_POST["submit_news"])){

    $title = mysqli_real_escape_string($con, $_POST["title"]);
    $description = mysqli_real_escape_string($con, $_POST["description"]);

    $image_names = [];

    if(!empty($_FILES["images"]["name"][0])){

        $target_path = "../uploads/news/";
        if(!is_dir($target_path)){
            mkdir($target_path, 0777, true);
        }

        foreach($_FILES["images"]["name"] as $key => $name){
            $tmp = $_FILES["images"]["tmp_name"][$key];

            $new_name = time() . "_" . rand(1000,9999) . "_" . basename($name);
            move_uploaded_file($tmp, $target_path . $new_name);

            $image_names[] = $new_name;
        }
    }

    $images = implode(",", $image_names);
    $date = date("Y-m-d H:i:s");

    $sql = "INSERT INTO tbl_news (title, description, image, created_at)
            VALUES ('$title', '$description', '$images', '$date')";

    if(mysqli_query($con, $sql)){
        header("Location: add_views_news.php?msg=".urlencode("News Published Successfully")."&type=success");
        exit;
    } else {
        header("Location: add_views_news.php?msg=".urlencode("Failed to publish news")."&type=error");
        exit;
    }
}

/* -----------------------------
   DELETE NEWS (ALL IMAGES)
------------------------------ */
if(isset($_GET["delete"])){
    $del_id = intval($_GET["delete"]);

    $img = mysqli_fetch_assoc(mysqli_query($con, "SELECT image FROM tbl_news WHERE id='$del_id'"));
    if($img && $img["image"]){
        $imgs = explode(",", $img["image"]);
        foreach($imgs as $pic){
            $path = "../uploads/news/" . $pic;
            if(file_exists($path)){ unlink($path); }
        }
    }

    mysqli_query($con, "DELETE FROM tbl_news WHERE id='$del_id'");
    header("Location: add_views_news.php?msg=".urlencode("News Deleted")."&type=success");
    exit;
}

/* -----------------------------
   ADD / UPDATE BREAKING NEWS
------------------------------ */
if(isset($_POST['submit_breaking_news'])){
    $breaking_text = mysqli_real_escape_string($con, trim($_POST['breaking_news_text']));
    $date = date("Y-m-d H:i:s");
    
    if(!empty($breaking_text)) {
        if(isset($_POST['edit_breaking_id']) && !empty($_POST['edit_breaking_id'])){
            $edit_id = intval($_POST['edit_breaking_id']);
            mysqli_query($con, "UPDATE tbl_breaking_news SET title='$breaking_text' WHERE id='$edit_id'");
            header("Location: add_views_news.php?msg=".urlencode("Breaking News Updated")."&type=success#breaking_news_hub");
        } else {
            mysqli_query($con, "INSERT INTO tbl_breaking_news (`title`, `posted_by`, `created_at`) VALUES ('$breaking_text', 'Admin', '$date')");
            header("Location: add_views_news.php?msg=".urlencode("Breaking News Added")."&type=success#breaking_news_hub");
        }
        exit;
    }
}

// Check for edit request
$edit_mode_br = false;
$edit_title_br = "";
$edit_id_br = "";
if(isset($_GET['edit_breaking'])){
    $edit_mode_br = true;
    $edit_id_br = intval($_GET['edit_breaking']);
    $q_br = mysqli_query($con, "SELECT title FROM tbl_breaking_news WHERE id='$edit_id_br'");
    if(mysqli_num_rows($q_br) > 0){
        $edit_title_br = mysqli_fetch_assoc($q_br)['title'];
    }
}

/* -----------------------------
   DELETE BREAKING NEWS
------------------------------ */
if(isset($_GET['delete_breaking'])){
    $id = intval($_GET['delete_breaking']);
    mysqli_query($con, "DELETE FROM tbl_breaking_news WHERE id='$id'");
    header("Location: add_views_news.php?msg=".urlencode("Breaking News Deleted")."&type=success#breaking_news_hub");
    exit;
}

/* -----------------------------
   TOGGLE BREAKING NEWS STATUS
------------------------------ */
if(isset($_GET['toggle_breaking'])){
    $id = intval($_GET['toggle_breaking']);
    $status = intval($_GET['status']);
    mysqli_query($con, "UPDATE tbl_breaking_news SET is_active='$status' WHERE id='$id'");
    header("Location: add_views_news.php#breaking_news_hub");
    exit;
}

// Fetch breaking news list
$fetch_breaking = mysqli_query($con, "SELECT * FROM tbl_breaking_news ORDER BY id DESC");
$total_breaking = mysqli_num_rows($fetch_breaking);

/* -----------------------------
   FETCH ALL NEWS
------------------------------ */
$fetch_news = mysqli_query($con, "SELECT * FROM tbl_news ORDER BY id DESC");
$total_news = mysqli_num_rows($fetch_news);
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">

  <?php if(isset($_GET['msg'])): 
    $is_success = (isset($_GET['type']) && $_GET['type']=='success');
  ?>
    <div class="p-4 rounded-xl flex items-center justify-between border <?= $is_success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800' ?>">
      <div class="flex items-center gap-3">
        <i class="fa-solid <?= $is_success ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600' ?> text-lg"></i>
        <span class="text-xs font-semibold"><?= htmlspecialchars($_GET['msg']) ?></span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
    </div>
  <?php endif; ?>

  <!-- ================= SECTION 1: ALL NEWS (FULL WIDTH TABLE) ================= -->
  <div class="premium-card overflow-hidden">
    
    <!-- Sub-Header / Action Bar -->
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="index.php" class="btn-back-nav">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            News & Articles
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage news feeds, editorial articles and photo attachments</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input type="search" id="searchInput" placeholder="Search news...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Total: <span class="text-blue-600 font-bold"><?= $total_news ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddNewsModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-plus text-xs"></i>
          <span>Add News</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="newsTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3 w-36">Images</th>
            <th class="premium-th px-5 py-3 w-1/4">Title</th>
            <th class="premium-th px-5 py-3">Description</th>
            <th class="premium-th px-5 py-3 w-40">Published Date</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="newsTableBody">
          <?php $i=1; while($row = mysqli_fetch_assoc($fetch_news)): ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $i++ ?></td>

              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1.5 flex-wrap max-w-[140px]">
                  <?php
                  $imgs = array_filter(explode(",", $row["image"]));
                  if(count($imgs) > 0):
                    foreach($imgs as $img):
                      $path = "../uploads/news/" . trim($img);
                  ?>
                    <img src="<?= $path ?>" onclick="openImageModal('<?= $path ?>')" 
                         class="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs hover:scale-105 transition cursor-pointer"
                         alt="News img">
                  <?php endforeach; else: ?>
                    <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <i class="fa-solid fa-image text-xs"></i>
                    </div>
                  <?php endif; ?>
                </div>
              </td>

              <td class="px-5 py-3.5">
                <span class="font-bold text-slate-900 text-sm block leading-snug"><?= htmlspecialchars($row["title"]) ?></span>
                <span class="text-[11px] text-slate-400 font-medium">ID: #<?= $row['id'] ?></span>
              </td>

              <td class="px-5 py-3.5">
                <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed" id="desc-<?= $row['id'] ?>">
                  <?= htmlspecialchars($row["description"]) ?>
                </p>
                <button type="button" onclick="toggleDescription('desc-<?= $row['id'] ?>', this)"
                  class="text-blue-600 text-[11px] font-semibold hover:underline mt-1 block">
                  see more
                </button>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y, h:i A", strtotime($row["created_at"])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <a href="admin_news_edit?id=<?= $row['id'] ?>" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </a>
                  <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this news article?');" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php endwhile; ?>

          <?php if($total_news == 0): ?>
            <tr>
              <td colspan="6" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-newspaper"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No news articles found</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add News" to publish your first article</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: News -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="newsCards">
      <?php 
      if($total_news > 0):
        mysqli_data_seek($fetch_news, 0);
        while($row = mysqli_fetch_assoc($fetch_news)):
          $imgs = array_filter(explode(",", $row["image"]));
          $first_img = !empty($imgs) ? "../uploads/news/" . trim($imgs[0]) : null;
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs news-card transition hover:shadow-xs">
        <div class="flex items-start justify-between gap-2.5 mb-2.5">
          <div class="flex items-start gap-2.5 min-w-0">
            <?php if($first_img): ?>
              <img src="<?= $first_img ?>" onclick="openImageModal('<?= $first_img ?>')" 
                   class="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs flex-shrink-0 cursor-pointer" alt="News">
            <?php else: ?>
              <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 font-bold">
                <i class="fa-solid fa-newspaper text-sm"></i>
              </div>
            <?php endif; ?>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-2"><?= htmlspecialchars($row["title"]) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium mt-0.5">
                <i class="fa-regular fa-calendar text-[9px] mr-1"></i><?= date("d M Y", strtotime($row["created_at"])) ?> • ID: #<?= $row['id'] ?>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            <a href="admin_news_edit?id=<?= $row['id'] ?>" title="Edit"
              class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-pen text-[11px]"></i>
            </a>
            <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this news article?');" title="Delete"
              class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </a>
          </div>
        </div>

        <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100" id="mdesc-<?= $row['id'] ?>">
          <?= htmlspecialchars($row["description"]) ?>
        </p>
        <button type="button" onclick="toggleDescription('mdesc-<?= $row['id'] ?>', this)"
          class="text-blue-600 text-[11px] font-semibold hover:underline mt-1.5 inline-block">
          see more
        </button>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No news articles found</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

  <!-- ================= SECTION 2: BREAKING NEWS HUB (FULL WIDTH) ================= -->
  <div id="breaking_news_hub" class="premium-card overflow-hidden">
    <div class="px-5 py-3.5 border-b border-rose-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-rose-50/50">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-xs animate-pulse">
          <i class="fa-solid fa-bolt"></i>
        </div>
        <div>
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            Breaking News Ticker
          </h2>
          <p class="text-xs text-slate-400 font-medium">Live alerts displayed across mobile app and web tickers</p>
        </div>
      </div>

      <div class="page-subheader-right">
        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          Active Tickers: <span class="text-rose-600 font-bold"><?= $total_breaking ?></span>
        </div>

        <button type="button" onclick="openBreakingModal()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition">
          <i class="fa-solid fa-bullhorn text-xs"></i>
          <span>Add Ticker</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table: Breaking News -->
    <div class="hidden sm:block overflow-y-auto max-h-[380px]">
      <table class="w-full text-left border-collapse">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3">Ticker Title</th>
            <th class="premium-th px-5 py-3 w-40">Posted By</th>
            <th class="premium-th px-5 py-3 text-center w-28">Live Status</th>
            <th class="premium-th px-5 py-3 text-center w-28">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          <?php if($total_breaking > 0): 
            mysqli_data_seek($fetch_breaking, 0);
            while($br = mysqli_fetch_assoc($fetch_breaking)): ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 font-bold text-slate-800 text-sm">
                <?= htmlspecialchars($br['title']) ?>
              </td>
              <td class="px-5 py-3.5 text-xs text-slate-600 font-medium">
                <span class="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                  <i class="fa-solid fa-user-shield text-[10px] text-slate-400"></i>
                  <?= htmlspecialchars($br['posted_by']) ?>
                </span>
              </td>
              <td class="px-5 py-3.5 text-center">
                <?php if($br['is_active'] == 1): ?>
                  <a href="?toggle_breaking=<?= $br['id'] ?>&status=0" onclick="return confirm('Turn OFF this ticker?');" 
                     class="status-badge status-active inline-flex cursor-pointer hover:opacity-80 transition" title="Click to disable">
                    <span class="status-badge-dot"></span> LIVE
                  </a>
                <?php else: ?>
                  <a href="?toggle_breaking=<?= $br['id'] ?>&status=1" onclick="return confirm('Turn ON this ticker?');" 
                     class="status-badge status-blocked inline-flex cursor-pointer hover:opacity-80 transition" title="Click to activate">
                    <span class="status-badge-dot"></span> OFF
                  </a>
                <?php endif; ?>
              </td>
              <td class="px-5 py-3.5 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button type="button" onclick="editBreakingItem(<?= $br['id'] ?>, '<?= htmlspecialchars(addslashes($br['title'])) ?>')" title="Edit"
                    class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs cursor-pointer">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                  <a href="?delete_breaking=<?= $br['id'] ?>#breaking_news_hub" onclick="return confirm('Delete this breaking ticker?');" title="Delete"
                    class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </a>
                </div>
              </td>
            </tr>
          <?php endwhile; else: ?>
            <tr>
              <td colspan="4" class="text-center py-10 text-slate-400">No active breaking news tickers found.</td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Breaking News -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="breakingCards">
      <?php if($total_breaking > 0): 
        mysqli_data_seek($fetch_breaking, 0);
        while($br = mysqli_fetch_assoc($fetch_breaking)): ?>
        <div class="premium-card p-3.5 bg-white border border-rose-100 rounded-xl shadow-2xs">
          <div class="flex items-start justify-between gap-2.5 mb-2">
            <h4 class="text-xs font-bold text-slate-900 leading-snug"><?= htmlspecialchars($br['title']) ?></h4>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" onclick="editBreakingItem(<?= $br['id'] ?>, '<?= htmlspecialchars(addslashes($br['title'])) ?>')" title="Edit"
                class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition shadow-2xs cursor-pointer">
                <i class="fa-solid fa-pen text-[11px]"></i>
              </button>
              <a href="?delete_breaking=<?= $br['id'] ?>#breaking_news_hub" onclick="return confirm('Delete this breaking ticker?');" title="Delete"
                class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                <i class="fa-solid fa-trash text-[11px]"></i>
              </a>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span class="text-slate-500 font-medium flex items-center gap-1">
              <i class="fa-solid fa-user-shield text-[10px] text-slate-400"></i> <?= htmlspecialchars($br['posted_by']) ?>
            </span>
            <div>
              <?php if($br['is_active'] == 1): ?>
                <a href="?toggle_breaking=<?= $br['id'] ?>&status=0" onclick="return confirm('Turn OFF this ticker?');" 
                   class="status-badge status-active inline-flex text-[10px] py-0.5 px-2">
                  <span class="status-badge-dot"></span> LIVE
                </a>
              <?php else: ?>
                <a href="?toggle_breaking=<?= $br['id'] ?>&status=1" onclick="return confirm('Turn ON this ticker?');" 
                   class="status-badge status-blocked inline-flex text-[10px] py-0.5 px-2">
                  <span class="status-badge-dot"></span> OFF
                </a>
              <?php endif; ?>
            </div>
          </div>
        </div>
      <?php endwhile; else: ?>
        <div class="text-center py-6 text-slate-400">
          <p class="text-xs">No active tickers</p>
        </div>
      <?php endif; ?>
    </div>
  </div>

</main>

<!-- ================= MODAL: ADD NEWS ARTICLE ================= -->
<div id="addNewsModal" class="admin-modal-overlay">
  <div class="admin-modal-card" style="max-width: 36rem;">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-newspaper"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Publish News Article</h3>
          <p class="text-[11px] text-slate-400">Create new story with photo attachments</p>
        </div>
      </div>
      <button type="button" onclick="closeAddNewsModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" enctype="multipart/form-data" class="flex flex-col flex-1 overflow-hidden">
      <div class="admin-modal-body space-y-4">
        
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Article Headline</label>
          <input type="text" name="title" required placeholder="Enter compelling news headline"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Article Description</label>
          <textarea name="description" required rows="5" placeholder="Write full news article content..."
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition resize-none"></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Attach News Images</label>
          
          <div class="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/20 transition cursor-pointer relative bg-slate-50/50">
            <input type="file" name="images[]" multiple required accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" onchange="previewNewsImages(event)">
            <div id="newsDropzoneContent">
              <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-400 mb-1.5"></i>
              <p class="text-xs font-semibold text-slate-700">Select Multiple Images or Drag & Drop</p>
              <p class="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP supported</p>
            </div>
            <div id="newsPreviewGrid" class="hidden flex flex-wrap gap-2 mt-2 justify-center"></div>
          </div>
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeAddNewsModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_news" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-paper-plane text-xs"></i>
          <span>Publish Article</span>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ================= MODAL: BREAKING NEWS TICKER ================= -->
<div id="breakingModal" class="admin-modal-overlay">
  <div class="admin-modal-card">
    <div class="admin-modal-header bg-rose-50/60">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-bolt"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight" id="breakingModalTitle">Add Breaking News</h3>
          <p class="text-[11px] text-slate-400">Headline alert for live mobile and web ticker</p>
        </div>
      </div>
      <button type="button" onclick="closeBreakingModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" class="flex flex-col flex-1 overflow-hidden">
      <input type="hidden" name="edit_breaking_id" id="editBreakingId" value="">
      
      <div class="admin-modal-body space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ticker Alert Headline</label>
          <textarea name="breaking_news_text" id="breakingNewsText" rows="3" required placeholder="Type urgent announcement or headline..."
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-xs text-slate-800 font-medium transition resize-none"></textarea>
        </div>
      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeBreakingModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" name="submit_breaking_news" class="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer transition">
          <i class="fa-solid fa-bullhorn text-xs"></i>
          <span id="breakingSubmitBtn">Save Ticker</span>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ================= IMAGE PREVIEW LIGHTBOX ================= -->
<div id="imagePreviewModal" class="admin-modal-overlay" onclick="closeImageModal()">
  <div class="relative max-w-4xl max-h-[90vh] p-2" onclick="event.stopPropagation()">
    <img id="modalPreviewImage" src="" class="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800">
    <button onclick="closeImageModal()" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition">
      <i class="fa-solid fa-xmark text-sm"></i>
    </button>
  </div>
</div>

</body>
<script>
function openAddNewsModal() {
  document.getElementById('addNewsModal').classList.add('active');
}
function closeAddNewsModal() {
  document.getElementById('addNewsModal').classList.remove('active');
}

function openBreakingModal() {
  document.getElementById('editBreakingId').value = '';
  document.getElementById('breakingNewsText').value = '';
  document.getElementById('breakingModalTitle').innerText = 'Add Breaking News';
  document.getElementById('breakingSubmitBtn').innerText = 'Save Ticker';
  document.getElementById('breakingModal').classList.add('active');
}
function closeBreakingModal() {
  document.getElementById('breakingModal').classList.remove('active');
}

function editBreakingItem(id, title) {
  document.getElementById('editBreakingId').value = id;
  document.getElementById('breakingNewsText').value = title;
  document.getElementById('breakingModalTitle').innerText = 'Edit Breaking News';
  document.getElementById('breakingSubmitBtn').innerText = 'Update Ticker';
  document.getElementById('breakingModal').classList.add('active');
}

function previewNewsImages(event) {
  const files = event.target.files;
  const grid = document.getElementById('newsPreviewGrid');
  grid.innerHTML = '';
  if (files.length > 0) {
    grid.classList.remove('hidden');
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = function(e) {
        grid.innerHTML += `<img src="${e.target.result}" class="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs">`;
      }
      reader.readAsDataURL(files[i]);
    }
  }
}

function toggleDescription(id, btn) {
  let el = document.getElementById(id);
  if (el.classList.contains('line-clamp-2')) {
    el.classList.remove('line-clamp-2');
    btn.innerText = "see less";
  } else {
    el.classList.add('line-clamp-2');
    btn.innerText = "see more";
  }
}

function openImageModal(src) {
  document.getElementById('modalPreviewImage').src = src;
  document.getElementById('imagePreviewModal').classList.add('active');
}

function closeImageModal() {
  document.getElementById('imagePreviewModal').classList.remove('active');
  document.getElementById('modalPreviewImage').src = "";
}

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#newsTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#newsCards .news-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



