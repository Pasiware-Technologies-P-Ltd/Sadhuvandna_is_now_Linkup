<?php
session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {
    header("Location: admin_login");
    exit;
}

date_default_timezone_set("Asia/Kolkata");

/* ============= UPLOAD MUSIC ===============*/
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_FILES['music'])) {
    $uploadDir = __DIR__ . '/../uploads/music/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $allowed = ['mp3', 'wav', 'm4a', 'ogg'];
    $maxSize = 20 * 1024 * 1024; // 20MB
    $uploaded = 0;
    $errors = [];

    $file_count = count($_FILES['music']['name']);
    for ($i = 0; $i < $file_count; $i++) {
        $file_name = $_FILES['music']['name'][$i];
        $file_size = $_FILES['music']['size'][$i];
        $file_error = $_FILES['music']['error'][$i];
        $temp_name = $_FILES['music']['tmp_name'][$i];

        if ($file_error !== UPLOAD_ERR_OK) {
            continue;
        }

        $ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed)) {
            $errors[] = "$file_name: Unsupported audio format";
            continue;
        }

        if ($file_size > $maxSize) {
            $errors[] = "$file_name: File size exceeds 20MB limit";
            continue;
        }

        $new_file_name = time() . "_" . uniqid() . "." . $ext;
        $hash = @md5_file($temp_name) ?: '';

        // DUPLICATE CHECK
        $is_dup = false;
        if (!empty($hash)) {
            $chk = mysqli_prepare($con, "SELECT id FROM music WHERE file_hash = ? LIMIT 1");
            if ($chk) {
                mysqli_stmt_bind_param($chk, 's', $hash);
                mysqli_stmt_execute($chk);
                mysqli_stmt_store_result($chk);
                $is_dup = mysqli_stmt_num_rows($chk) > 0;
                mysqli_stmt_close($chk);
            }
        }
        
        if ($is_dup) continue;

        // AUTO META
        $fileWithoutExt = pathinfo($file_name, PATHINFO_FILENAME);
        $parts = explode("_", $fileWithoutExt);

        $artist_auto = $parts[0] ?? "Unknown";
        
        $title_parts = array_slice($parts, 1);
        $title_auto = implode(" ", $title_parts);
        if (empty($title_auto)) {
            $title_auto = $fileWithoutExt;
        }

        $tags_array = array_slice($parts, 2);
        $tags_auto = implode(",", $tags_array);

        $artist_auto = ucwords(strtolower(str_replace("_", " ", $artist_auto)));
        $title_auto = ucwords(strtolower(str_replace("_", " ", $title_auto)));

        if (move_uploaded_file($temp_name, $uploadDir . $new_file_name)) {
            $stmt = mysqli_prepare($con, "INSERT INTO music (title, artist, file_name, tags, file_hash) VALUES (?, ?, ?, ?, ?)");
            if ($stmt) {
                mysqli_stmt_bind_param($stmt, 'sssss', $title_auto, $artist_auto, $new_file_name, $tags_auto, $hash);
                if (!mysqli_stmt_execute($stmt)) {
                    $errors[] = "Database insert failed for '$file_name': " . mysqli_stmt_error($stmt);
                } else {
                    $uploaded++;
                }
                mysqli_stmt_close($stmt);
            } else {
                $errors[] = "Database prepare failed for '$file_name': " . mysqli_error($con);
            }
        } else {
            $errors[] = "Failed to move file '$file_name' to upload directory";
        }
    }
    
    $msg = "$uploaded audio track(s) uploaded successfully!";
    $type = "success";
    if (!empty($errors)) {
        $msg .= " | Errors: " . implode(" | ", $errors);
        $type = $uploaded == 0 ? "error" : "warning";
    }
    
    header("Location: upload_music.php?msg=".urlencode($msg)."&type=".$type);
    exit;
}

/* ============= DELETE ===============*/
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    $result = mysqli_query($con, "SELECT file_name FROM music WHERE id='$id'");
    if ($result) {
        $old = mysqli_fetch_assoc($result);
        if ($old && $old['file_name']) {
            $file = __DIR__ . '/../uploads/music/' . $old['file_name'];
            if (file_exists($file)) unlink($file);
        }
    }
    mysqli_query($con, "DELETE FROM music WHERE id='$id'");
    header("Location: upload_music.php?msg=".urlencode("Track Deleted")."&type=success");
    exit;
}

$data = mysqli_query($con, "SELECT * FROM music ORDER BY id DESC");
$total_count = $data ? mysqli_num_rows($data) : 0;
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

  <?php if(isset($_GET['msg'])): 
    $msg_type = isset($_GET['type']) ? $_GET['type'] : 'error';
    $is_success = ($msg_type == 'success');
    $is_warning = ($msg_type == 'warning');
    $alertClass = $is_success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ($is_warning ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800');
  ?>
    <div class="mb-5 p-4 rounded-xl flex items-center justify-between border <?= $alertClass ?>">
      <div class="flex items-center gap-3">
        <i class="fa-solid <?= $is_success ? 'fa-circle-check text-emerald-600' : ($is_warning ? 'fa-triangle-exclamation text-amber-600' : 'fa-circle-exclamation text-rose-600') ?> text-lg"></i>
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
            Music & Audio Management
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage background scores, devotional tracks, and media sounds</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" id="searchInput" placeholder="Search title, artist, tags...">
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Tracks: <span class="text-blue-600 font-bold"><?= $total_count ?></span>
        </div>

        <!-- Add Button Trigger Modal -->
        <button type="button" onclick="openAddModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-cloud-arrow-up text-xs"></i>
          <span>Upload Tracks</span>
        </button>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="musicTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3">Title & Details</th>
            <th class="premium-th px-5 py-3 w-40">Artist</th>
            <th class="premium-th px-5 py-3 w-32">Tags</th>
            <th class="premium-th px-5 py-3 w-64">Audio Player</th>
            <th class="premium-th px-5 py-3 w-36">Added Date</th>
            <th class="premium-th px-5 py-3 text-center w-24">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="musicTableBody">
          <?php if ($data && $total_count > 0): $sr = 1; while($row = mysqli_fetch_assoc($data)) { ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-music text-xs"></i>
                  </div>
                  <div class="min-w-0">
                    <span class="font-bold text-slate-900 text-sm truncate block" title="<?= htmlspecialchars($row['title']) ?>">
                      <?= htmlspecialchars($row['title']) ?>
                    </span>
                    <span class="text-[11px] text-slate-400 font-medium truncate block">File: <?= htmlspecialchars($row['file_name']) ?></span>
                  </div>
                </div>
              </td>

              <td class="px-5 py-3.5">
                <span class="text-xs font-semibold text-slate-700 block"><?= htmlspecialchars($row['artist'] ?: 'Unknown') ?></span>
              </td>

              <td class="px-5 py-3.5">
                <?php if(!empty($row['tags'])): ?>
                  <span class="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]" title="<?= htmlspecialchars($row['tags']) ?>">
                    <?= htmlspecialchars($row['tags']) ?>
                  </span>
                <?php else: ?>
                  <span class="text-slate-300 text-xs">-</span>
                <?php endif; ?>
              </td>

              <td class="px-5 py-3.5">
                <audio controls class="h-8 w-60 max-w-full">
                  <source src="../uploads/music/<?= htmlspecialchars($row['file_name']) ?>" />
                </audio>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y", strtotime($row['created_at'])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <a href="?delete=<?= $row['id'] ?>"
                  onclick="return confirm('Delete this audio track?')" title="Delete"
                  class="w-8 h-8 mx-auto rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                  <i class="fa-solid fa-trash text-xs"></i>
                </a>
              </td>
            </tr>
          <?php } else: ?>
            <tr>
              <td colspan="7" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-music"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No audio tracks uploaded yet</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Upload Tracks" above to add new audio files</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View: Music Tracks -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="musicCards">
      <?php 
      if($total_count > 0):
        mysqli_data_seek($data, 0);
        while($row = mysqli_fetch_assoc($data)):
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs music-card transition hover:shadow-xs">
        <div class="flex items-start justify-between gap-2.5 mb-2.5">
          <div class="flex items-start gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0 font-bold">
              <i class="fa-solid fa-music text-xs"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 leading-snug truncate"><?= htmlspecialchars($row['title']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium">Artist: <?= htmlspecialchars($row['artist'] ?: 'Unknown') ?></p>
            </div>
          </div>

          <a href="?delete=<?= $row['id'] ?>" onclick="return confirm('Delete this audio track?')" title="Delete"
            class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs flex-shrink-0">
            <i class="fa-solid fa-trash text-[11px]"></i>
          </a>
        </div>

        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2">
          <audio controls class="h-8 w-full">
            <source src="../uploads/music/<?= htmlspecialchars($row['file_name']) ?>" />
          </audio>

          <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/60">
            <span>
              <?php if(!empty($row['tags'])): ?>
                <span class="bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded text-[9px]"><?= htmlspecialchars($row['tags']) ?></span>
              <?php else: ?>
                ID: #<?= $row['id'] ?>
              <?php endif; ?>
            </span>
            <span class="flex items-center gap-1">
              <i class="fa-regular fa-calendar text-[9px]"></i> <?= date("d M Y", strtotime($row['created_at'])) ?>
            </span>
          </div>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No audio tracks uploaded yet</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: UPLOAD AUDIO ================= -->
<div id="addModal" class="admin-modal-overlay">
  <div class="admin-modal-card">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-cloud-arrow-up"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Upload Audio Tracks</h3>
          <p class="text-[11px] text-slate-400">Batch upload mp3, wav, m4a or ogg files</p>
        </div>
      </div>
      <button type="button" onclick="closeAddModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <form method="POST" enctype="multipart/form-data" class="flex flex-col flex-1 overflow-hidden">
      <div class="admin-modal-body space-y-4">

        <div class="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/20 transition cursor-pointer relative bg-slate-50/50">
          <input type="file" name="music[]" id="modalAudioInput" accept="audio/*" multiple required class="absolute inset-0 opacity-0 cursor-pointer" onchange="handleAudioFileSelect(event)">
          <div id="dropzoneContent">
            <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 text-xl">
              <i class="fa-solid fa-headphones"></i>
            </div>
            <p class="text-xs font-bold text-slate-800">Select Audio Tracks or Drag & Drop</p>
            <p class="text-[11px] text-slate-400 mt-1">Allowed formats: MP3, WAV, M4A, OGG</p>
            <p class="text-[10px] text-slate-400">Max 20MB per file. Multiple files supported.</p>
          </div>
          <div id="selectedAudioList" class="hidden text-left mt-3 pt-3 border-t border-slate-200 space-y-1 max-h-36 overflow-y-auto"></div>
        </div>

        <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
          <i class="fa-solid fa-circle-info text-blue-600 text-xs mt-0.5"></i>
          <p class="text-[11px] text-blue-800 leading-relaxed font-medium">
            <strong>Pro Tip:</strong> Files named as <code class="bg-blue-100 px-1 rounded">Artist_Title_Tags.mp3</code> will have their title, artist, and tags auto-detected!
          </p>
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" onclick="closeAddModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
          Cancel
        </button>
        <button type="submit" class="btn-brand-primary px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-cloud-arrow-up text-xs"></i>
          <span>Start Upload</span>
        </button>
      </div>
    </form>
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

function handleAudioFileSelect(e) {
  const files = e.target.files;
  const listEl = document.getElementById('selectedAudioList');
  if (files.length > 0) {
    listEl.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
      listEl.innerHTML += `<div class="text-[11px] text-slate-700 flex items-center gap-2 truncate">
        <i class="fa-solid fa-file-audio text-blue-500"></i> ${files[i].name} <span class="text-slate-400">(${(files[i].size / 1024 / 1024).toFixed(1)} MB)</span>
      </div>`;
    }
    listEl.classList.remove('hidden');
  }
}

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#musicTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#musicCards .music-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>



