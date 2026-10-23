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
mysqli_query($con, "CREATE TABLE IF NOT EXISTS tbl_contact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    mobile VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

// Get message from session if exists
$msg = "";
$msgType = "";
if (isset($_SESSION['msg'])) {
    $msg = $_SESSION['msg'];
    $msgType = $_SESSION['msgType'];
    unset($_SESSION['msg']);
    unset($_SESSION['msgType']);
}

// Handle Manual Add
if (isset($_POST['add_contact'])) {
    $name = mysqli_real_escape_string($con, trim($_POST['name'] ?? ''));
    $mobile = mysqli_real_escape_string($con, trim($_POST['mobile'] ?? ''));

    if (!empty($name) && !empty($mobile)) {
        $q = "INSERT INTO tbl_contact (name, mobile) VALUES ('$name', '$mobile')";
        if (mysqli_query($con, $q)) {
            $_SESSION['msg'] = "Contact added successfully!";
            $_SESSION['msgType'] = "success";
        } else {
            $_SESSION['msg'] = "Error: " . mysqli_error($con);
            $_SESSION['msgType'] = "error";
        }
    } else {
        $_SESSION['msg'] = "Please fill all fields.";
        $_SESSION['msgType'] = "error";
    }
    header("Location: admin_add_contact.php");
    exit;
}

// Handle CSV Import
if (isset($_POST['import_csv'])) {
    if (!empty($_FILES['csv_file']['name'])) {
        $ext = pathinfo($_FILES['csv_file']['name'], PATHINFO_EXTENSION);
        if (strtolower($ext) !== 'csv') {
            $_SESSION['msg'] = "Invalid file type. Please upload a .CSV file (not .xlsx).";
            $_SESSION['msgType'] = "error";
        } else {
            $filename = $_FILES['csv_file']['tmp_name'];
            $file = fopen($filename, "r");
            
            // Skip header
            $header = fgetcsv($file);
            
            $count = 0;
            $errorCount = 0;
            while (($data = fgetcsv($file, 10000, ",")) !== FALSE) {
                if (count($data) == 1 && strpos($data[0], ';') !== false) {
                    $data = str_getcsv($data[0], ';');
                }

                if (count($data) >= 2) {
                    $name = mysqli_real_escape_string($con, trim($data[0]));
                    $mobile = mysqli_real_escape_string($con, trim($data[1]));
                    
                    if (!empty($name) && !empty($mobile)) {
                        if (preg_match('/[^\x20-\x7E\s]/', $name) && strlen($name) > 50) {
                            $errorCount++;
                            continue; 
                        }
                        
                        mysqli_query($con, "INSERT INTO tbl_contact (name, mobile) VALUES ('$name', '$mobile')");
                        $count++;
                    }
                } else {
                    $errorCount++;
                }
            }
            fclose($file);
            
            if ($count > 0) {
                $statusMsg = "Successfully imported $count contacts!";
                if ($errorCount > 0) $statusMsg .= " (Skipped $errorCount invalid rows)";
                $_SESSION['msg'] = $statusMsg;
                $_SESSION['msgType'] = "success";
            } else {
                $_SESSION['msg'] = "No valid contacts found in the file. Please ensure it's a properly formatted CSV.";
                $_SESSION['msgType'] = "error";
            }
        }
    } else {
        $_SESSION['msg'] = "Please select a CSV file.";
        $_SESSION['msgType'] = "error";
    }
    header("Location: admin_add_contact.php");
    exit;
}

// Handle Delete Single
if (isset($_GET['delete_id'])) {
    $id = intval($_GET['delete_id']);
    mysqli_query($con, "DELETE FROM tbl_contact WHERE id=$id");
    header("Location: admin_add_contact.php?msg=".urlencode("Contact Deleted")."&type=success");
    exit;
}

// Handle Delete All
if (isset($_GET['delete_all'])) {
    mysqli_query($con, "DELETE FROM tbl_contact");
    header("Location: admin_add_contact.php?msg=".urlencode("All contacts removed")."&type=success");
    exit;
}

$res = mysqli_query($con, "SELECT * FROM tbl_contact ORDER BY id DESC");
$total_contacts = mysqli_num_rows($res);
?>

<?php include("header.php"); ?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6">

  <?php if ($msg || isset($_GET['msg'])): 
    $display_msg = $msg ?: $_GET['msg'];
    $is_success = ($msgType == 'success') || (isset($_GET['type']) && $_GET['type']=='success');
  ?>
    <div class="mb-5 p-4 rounded-xl flex items-center justify-between border <?= $is_success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800' ?>">
      <div class="flex items-center gap-3">
        <i class="fa-solid <?= $is_success ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600' ?> text-lg"></i>
        <span class="text-xs font-semibold"><?= htmlspecialchars($display_msg) ?></span>
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
          <h2 class="text-base font-bold text-slate-900">
            Phonebook &amp; Contacts
          </h2>
          <p class="text-xs text-slate-400 font-medium">Manage broadcast directory and import contacts via Excel CSV</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" 
            id="searchInput" 
            placeholder="Search contact or mobile..."
          >
        </div>

        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Contacts: <span class="text-blue-600 font-bold"><?= $total_contacts ?></span>
        </div>

        <!-- Add Contact Trigger -->
        <button type="button" onclick="openAddModal()" class="btn-brand-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <i class="fa-solid fa-user-plus text-xs"></i>
          <span>Add Contact</span>
        </button>

        <!-- More Actions Dropdown (Clean & Safe) -->
        <?php if($total_contacts > 0): ?>
          <div class="relative">
            <button type="button" onclick="toggleContactActionsMenu()" id="contactActionsBtn" 
                    class="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center transition shadow-2xs cursor-pointer" 
                    title="More Options">
              <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
            </button>

            <div id="contactActionsDropdown" class="hidden absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30">
              <a href="?delete_all=true" onclick="return confirm('⚠️ Warning: Are you sure you want to delete ALL contacts? This cannot be undone!')" 
                 class="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition">
                <i class="fa-solid fa-trash-can text-xs"></i>
                <span>Clear All Contacts</span>
              </a>
            </div>
          </div>
        <?php endif; ?>
      </div>
    </div>

    <!-- Desktop Table Container -->
    <div class="hidden sm:block overflow-y-auto" style="max-height: calc(100vh - 190px);" id="tableScrollContainer">
      <table class="w-full text-left border-collapse" id="contactTable">
        <thead class="sticky top-0 z-10 shadow-2xs">
          <tr>
            <th class="premium-th px-5 py-3 w-14">#</th>
            <th class="premium-th px-5 py-3">Full Name</th>
            <th class="premium-th px-5 py-3 w-48">Mobile Number</th>
            <th class="premium-th px-5 py-3 w-44">Saved Date</th>
            <th class="premium-th px-5 py-3 text-center w-24">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 bg-white" id="contactTableBody">
          <?php $sr = 1; while($row = mysqli_fetch_assoc($res)): ?>
            <tr class="hover:bg-slate-50/80 transition-colors">
              <td class="px-5 py-3.5 text-xs text-slate-400 font-semibold"><?= $sr++ ?></td>

              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <i class="fa-solid fa-user text-xs"></i>
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 text-sm block"><?= htmlspecialchars($row['name']) ?></span>
                    <span class="text-[11px] text-slate-400 font-medium">Record ID: #<?= $row['id'] ?></span>
                  </div>
                </div>
              </td>

              <td class="px-5 py-3.5 text-xs font-semibold text-slate-800">
                <div class="flex items-center gap-1.5">
                  <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i>
                  <?= htmlspecialchars($row['mobile']) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar text-slate-400 text-xs"></i>
                  <?= date("d M Y, h:i A", strtotime($row['created_at'])) ?>
                </div>
              </td>

              <td class="px-5 py-3.5 text-center">
                <a href="?delete_id=<?= $row['id'] ?>" 
                  onclick="return confirm('Delete this contact?')" title="Delete"
                  class="w-8 h-8 mx-auto rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs">
                  <i class="fa-solid fa-trash text-xs"></i>
                </a>
              </td>
            </tr>
          <?php endwhile; ?>

          <?php if($total_contacts == 0): ?>
            <tr>
              <td colspan="5" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-3">
                    <i class="fa-solid fa-address-book"></i>
                  </div>
                  <p class="text-sm font-semibold text-slate-600">No contacts saved yet</p>
                  <p class="text-xs text-slate-400 mt-0.5">Click "Add Contact" or "Import CSV" to populate your phonebook</p>
                </div>
              </td>
            </tr>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="sm:hidden p-3 space-y-3 bg-slate-50/50" id="contactCards">
      <?php 
      if($total_contacts > 0):
        mysqli_data_seek($res, 0);
        while($row = mysqli_fetch_assoc($res)):
      ?>
      <div class="premium-card p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs contact-card transition hover:shadow-xs">
        <div class="flex items-start justify-between gap-2.5 mb-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
              <i class="fa-solid fa-user text-xs"></i>
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 truncate"><?= htmlspecialchars($row['name']) ?></h4>
              <p class="text-[10px] text-slate-400 font-medium">Record ID: #<?= $row['id'] ?></p>
            </div>
          </div>
          <a href="?delete_id=<?= $row['id'] ?>" 
            onclick="return confirm('Delete this contact?')" title="Delete"
            class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition shadow-2xs flex-shrink-0">
            <i class="fa-solid fa-trash text-[11px]"></i>
          </a>
        </div>

        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[11px] font-medium">Mobile:</span>
            <a href="tel:<?= htmlspecialchars($row['mobile']) ?>" class="font-bold text-blue-600 hover:underline flex items-center gap-1 text-xs">
              <i class="fa-solid fa-phone text-[10px]"></i> <?= htmlspecialchars($row['mobile']) ?>
            </a>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-[11px] font-medium">Saved:</span>
            <span class="text-slate-600 font-medium text-[11px]"><?= date("d M Y, h:i A", strtotime($row['created_at'])) ?></span>
          </div>
        </div>
      </div>
      <?php endwhile; else: ?>
        <div class="text-center py-8 text-slate-400">
          <p class="text-xs font-semibold">No contacts saved yet</p>
        </div>
      <?php endif; ?>
    </div>

  </div>

</main>

<!-- ================= MODAL: ADD CONTACT (MANUAL OR CSV) ================= -->
<div id="addModal" class="admin-modal-overlay">
  <div class="admin-modal-card" style="max-width: 32rem;">
    <div class="admin-modal-header">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
          <i class="fa-solid fa-user-plus"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Add New Contact</h3>
          <p class="text-[11px] text-slate-400">Add a single contact or batch import via CSV file</p>
        </div>
      </div>
      <button type="button" onclick="closeAddModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
        <i class="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <div class="admin-modal-body space-y-5">
      
      <!-- Option 1: Manual Single Contact Form -->
      <form method="POST" class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
          <input type="text" name="name" required placeholder="e.g. Ramesh Patel"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mobile Number *</label>
          <input type="text" name="mobile" required placeholder="10-digit mobile number"
            class="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs text-slate-800 font-medium transition">
        </div>

        <button type="submit" name="add_contact" class="btn-brand-primary w-full py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check text-xs"></i>
          <span>Save Single Contact</span>
        </button>
      </form>

      <!-- OR DIVIDER -->
      <div class="relative flex items-center justify-center my-3">
        <div class="border-t border-slate-200 w-full"></div>
        <span class="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">OR</span>
        <div class="border-t border-slate-200 w-full"></div>
      </div>

      <!-- Option 2: Batch CSV Upload Form -->
      <form method="POST" enctype="multipart/form-data" class="space-y-3 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-file-csv text-emerald-600"></i> Import From CSV (Excel)
          </label>
          <span class="text-[10px] text-slate-400 font-medium">Header: Name, Mobile</span>
        </div>

        <input type="file" name="csv_file" accept=".csv" required
          class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition cursor-pointer">

        <button type="submit" name="import_csv" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition">
          <i class="fa-solid fa-cloud-arrow-up text-xs"></i>
          <span>Upload & Import CSV</span>
        </button>
      </form>

    </div>
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

function toggleContactActionsMenu() {
  const menu = document.getElementById('contactActionsDropdown');
  if (menu) menu.classList.toggle('hidden');
}

document.addEventListener('click', function(e) {
  const btn = document.getElementById('contactActionsBtn');
  const menu = document.getElementById('contactActionsDropdown');
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

document.getElementById("searchInput").addEventListener("input", function(){
  let v = this.value.toLowerCase();
  document.querySelectorAll("#contactTableBody tr").forEach(r => {
    if (r.children.length > 1) {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    }
  });
  document.querySelectorAll("#contactCards .contact-card").forEach(c => {
    c.style.display = c.innerText.toLowerCase().includes(v) ? "" : "none";
  });
});
</script>
</html>

