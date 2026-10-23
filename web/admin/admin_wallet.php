<?php
session_start();
include("../connection.php");

$page_limit = 20;

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
        $whereClause = " WHERE m.name LIKE '%$search%' OR m.mobile LIKE '%$search%' OR w.payment_id LIKE '%$search%' OR w.id LIKE '%$search%' ";
    }
    
    $total_q = mysqli_query($con, "SELECT COUNT(*) as cnt FROM tbl_wallet w LEFT JOIN tbl_members m ON w.user_id = m.id $whereClause");
    $total_row = mysqli_fetch_assoc($total_q);
    $total_transactions = $total_row['cnt'] ?? 0;
    
    $q = mysqli_query($con, "
        SELECT w.*, m.name, m.mobile, m.profile_photo
        FROM tbl_wallet w
        LEFT JOIN tbl_members m ON w.user_id = m.id
        $whereClause
        ORDER BY w.date DESC
        LIMIT $limit OFFSET $offset
    ");
    
    $desktop_html = '';
    $mobile_html = '';
    
    if ($q) {
        while($row = mysqli_fetch_assoc($q)) {
            $txn = "#TXN" . str_pad($row['id'],3,'0',STR_PAD_LEFT);
            $raw_name = $row['name'] ?: 'Unknown';
            $name = htmlspecialchars(mb_convert_encoding($raw_name, 'UTF-8', 'UTF-8'));
            $phone = htmlspecialchars($row['mobile'] ?: '---');
            $amount = htmlspecialchars($row['payment_ammount'] ?? 0);
            $payment_id = htmlspecialchars($row['payment_id'] ?? '');
            $date = date("d M Y, h:i A", strtotime($row['date']));
            $status = htmlspecialchars(ucfirst($row['status'] ?? ''));
            
            $profile_html = '';
            if(!empty($row['profile_photo']) && file_exists("../uploads/photo/".$row['profile_photo'])) {
                $profile_html = '<img src="../uploads/photo/'.$row['profile_photo'].'" class="w-8 h-8 rounded-full border-2 border-blue-300 shadow cursor-pointer" onclick="openImageModal(\'../uploads/photo/'.$row['profile_photo'].'\')" />';
            } else {
                $firstChar = mb_substr($name, 0, 1, 'UTF-8');
                $profile_html = '<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">'.htmlspecialchars(mb_strtoupper($firstChar, 'UTF-8')).'</div>';
            }
            
            $desktop_html .= '<tr class="hover:bg-slate-50 transition search-row">
                <td class="px-4 py-2 text-sm">'.$txn.'</td>
                <td class="px-4 py-2 text-sm">
                  <div class="flex items-center gap-3">
                    '.$profile_html.'
                    <span class="font-semibold">'.$name.'</span>
                  </div>
                </td>
                <td class="px-4 py-2 text-sm">'.$phone.'</td>
                <td class="px-4 py-2 text-sm">'.$payment_id.'</td>
                <td class="px-4 py-2 text-sm text-green-600 font-bold">₹'.$amount.'</td>
                <td class="px-4 py-2 text-sm">'.$date.'</td>
                <td class="px-4 py-2 text-center">
                  <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Online</span>
                </td>
                <td class="px-4 py-2 text-center">
                  <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">'.$status.'</span>
                </td>
              </tr>';
              
            $mobile_html .= '<div class="bg-white p-4 rounded-xl shadow border border-gray-100 search-row-mob">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  '.$profile_html.'
                  <div>
                    <h3 class="font-bold text-gray-800">'.$name.'</h3>
                    <p class="text-xs text-gray-500">'.$txn.'</p>
                  </div>
                </div>
                <span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">'.$status.'</span>
              </div>
              <div class="mt-3 space-y-2">
                <div class="flex justify-between">
                  <span>Amount:</span>
                  <span class="font-bold text-green-600">₹'.$amount.'</span>
                </div>
                <div class="text-sm text-gray-600">'.$phone.'</div>
                <div class="text-sm text-gray-600">'.$date.'</div>
                <div class="text-sm text-gray-600">Online</div>
              </div>
            </div>';
        }
    }
    
    $payload = ['desktop' => $desktop_html, 'mobile' => $mobile_html, 'total' => $total_transactions];
    echo json_encode($payload, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$total_q = mysqli_query($con, "SELECT COUNT(*) as cnt FROM tbl_wallet");
$total_row = mysqli_fetch_assoc($total_q);
$total_transactions = $total_row['cnt'];

/* ---- Fetch Initial Wallet Transactions ---- */
$q = $con->query("
  SELECT w.*, m.name, m.mobile, m.profile_photo
  FROM tbl_wallet w
  LEFT JOIN tbl_members m ON w.user_id = m.id
  ORDER BY w.date DESC
  LIMIT $page_limit
");

$transactions = [];
while($row = $q->fetch_assoc()){
    $transactions[] = [
        'id' => $row['id'],
        'txn' => "#TXN" . str_pad($row['id'],3,'0',STR_PAD_LEFT),
        'name' => $row['name'] ?: 'Unknown',
        'phone' => $row['mobile'] ?: '---',
        'profile' => $row['profile_photo'],
        'amount' => $row['payment_ammount'],
        'payment_id' => $row['payment_id'],
        'date' => date("d M Y, h:i A", strtotime($row['date'])),
        'method' => "Online",
        'status' => ucfirst($row['status'])
    ];
}

/* ---- SUM of SUCCESS ONLY ---- */
$sum = $con->query("SELECT SUM(payment_ammount) FROM tbl_wallet WHERE status='success'")->fetch_row()[0] ?: 0;

/* ---- TOTAL SUCCESS DONORS ---- */
$donors = $con->query("SELECT COUNT(DISTINCT user_id) FROM tbl_wallet WHERE status='success'")->fetch_row()[0];

/* ---- THIS MONTH SUCCESS ---- */
$month = date("m");
$year = date("Y");
$monthSum = $con->query("SELECT SUM(payment_ammount) FROM tbl_wallet WHERE status='success' AND MONTH(date)=$month AND YEAR(date)=$year")->fetch_row()[0] ?: 0;
?>
<?php include("header.php"); ?>

<!-- MAIN -->
<main class="w-full px-4 sm:px-6 lg:px-8 py-6">



  <!-- STATS CARDS -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow-md p-3 border border-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <i class="fa-solid fa-wallet text-blue-600 text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Amount</p>
          <h3 class="text-lg font-black text-gray-800">₹<?= $sum ?></h3>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-md p-3 border border-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <i class="fa-solid fa-users text-green-600 text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Donors</p>
          <h3 class="text-lg font-black text-gray-800"><?= $donors ?></h3>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-md p-3 border border-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <i class="fa-solid fa-calendar text-brand-primary text-xl"></i>
        </div>
        <div>
          <p class="text-xs text-gray-500 font-semibold uppercase tracking-wider">This Month</p>
          <h3 class="text-lg font-black text-gray-800">₹<?= $monthSum ?></h3>
        </div>
      </div>
    </div>
  </div>

  <!-- Sub-Header / Filters (Visible on BOTH Mobile & Desktop) -->
  <div class="premium-card overflow-hidden mb-5">
    <div class="page-subheader">
      <div class="page-subheader-left">
        <a href="index.php" class="btn-back-nav" title="Back to Dashboard">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </a>
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">
            Wallet &amp; Earnings
          </h2>
          <p class="text-xs text-slate-400">All member donations and transaction logs</p>
        </div>
      </div>
      
      <div class="page-subheader-right">
        <div class="subheader-search">
          <i class="fa-solid fa-search subheader-search-icon"></i>
          <input 
            type="search" 
            id="searchInput" 
            placeholder="Search name, phone, or TXN..."
          >
        </div>
        <div class="premium-counter-pill">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          Total: <span id="totalTransactionsCount" class="text-blue-600 font-bold"><?= number_format($total_transactions) ?></span>
        </div>
      </div>
    </div>
  </div>

  <!-- LIST VIEW (Desktop Table) -->
  <div class="hidden md:block premium-card overflow-hidden mb-4">
    <div class="overflow-y-auto max-h-[525px]" id="tableScrollContainer">
      <table class="w-full text-sm border-t border-gray-100">
        <thead class="bg-slate-500 text-white sticky top-0 z-10">
          <tr>
            <th class="px-4 py-2 text-left font-medium">#</th>
            <th class="px-4 py-2 text-left font-medium">Donor Name</th>
            <th class="px-4 py-2 text-left font-medium">Phone</th>
            <th class="px-4 py-2 text-left font-medium">Transaction ID</th>
            <th class="px-4 py-2 text-left font-medium">Amount</th>
            <th class="px-4 py-2 text-left font-medium">Date & Time</th>
            <th class="px-4 py-2 text-center font-medium">Payment</th>
            <th class="px-4 py-2 text-center font-medium">Status</th>
          </tr>
        </thead>

        <tbody id="tableBody" class="divide-y divide-gray-200">
          <?php foreach($transactions as $t): ?>
          <tr class="hover:bg-slate-50 transition search-row">
            <td class="px-4 py-2 text-sm"><?= $t['txn'] ?></td>

            <td class="px-4 py-2 text-sm">
              <div class="flex items-center gap-3">

                <?php if(!empty($t['profile']) && file_exists("../uploads/photo/".$t['profile'])): ?>
                 <img 
  src="../uploads/photo/<?= $t['profile'] ?>" 
  class="w-8 h-8 rounded-full border-2 border-blue-300 shadow cursor-pointer"
  onclick="openImageModal('../uploads/photo/<?= $t['profile'] ?>')"
/>

                <?php else: ?>
                  <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    <?= strtoupper(substr($t['name'],0,1)) ?>
                  </div>
                <?php endif; ?>

                <span class="font-semibold"><?= $t['name'] ?></span>
              </div>
            </td>

            <td class="px-4 py-2 text-sm"><?= $t['phone'] ?></td>
            <td class="px-4 py-2 text-sm"><?= $t['payment_id'] ?></td>
            <td class="px-4 py-2 text-sm text-green-600 font-bold">₹<?= $t['amount'] ?></td>
            <td class="px-4 py-2 text-sm"><?= $t['date'] ?></td>

            <td class="px-4 py-2 text-center">
              <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Online</span>
            </td>

            <td class="px-4 py-2 text-center">
              <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><?= $t['status'] ?></span>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>

      </table>

    </div>
  </div>

  <!-- MOBILE VIEW -->
  <div class="md:hidden space-y-4" id="mobileCards">

    <?php foreach($transactions as $t): ?>
    <div class="bg-white p-4 rounded-xl shadow border border-gray-100 search-row-mob">

      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">

          <?php if(!empty($t['profile']) && file_exists("../uploads/photo/".$t['profile'])): ?>
            <img 
  src="../uploads/photo/<?= $t['profile'] ?>" 
  class="w-8 h-8 rounded-full border-2 border-blue-300 shadow cursor-pointer"
  onclick="openImageModal('../uploads/photo/<?= $t['profile'] ?>')"
/>

          <?php else: ?>
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              <?= strtoupper(substr($t['name'],0,1)) ?>
            </div>
          <?php endif; ?>

          <div>
            <h3 class="font-bold text-gray-800"><?= $t['name'] ?></h3>
            <p class="text-xs text-gray-500"><?= $t['txn'] ?></p>
          </div>

        </div>

        <span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><?= $t['status'] ?></span>
      </div>

      <div class="mt-3 space-y-2">
        <div class="flex justify-between">
          <span>Amount:</span>
          <span class="font-bold text-green-600">₹<?= $t['amount'] ?></span>
        </div>

        <div class="text-sm text-gray-600"><?= $t['phone'] ?></div>
        <div class="text-sm text-gray-600"><?= $t['date'] ?></div>
        <div class="text-sm text-gray-600"><?= $t['method'] ?></div>
      </div>

    </div>
    <?php endforeach; ?>
  </div>
<!-- IMAGE VIEW MODAL -->
<div id="imageModal" 
     class="fixed inset-0 bg-black bg-opacity-70 hidden items-center justify-center z-50 backdrop-blur-sm">

  <div class="relative max-w-[90%] max-h-[90%]">
    
    <!-- Close Button -->
    <button class="absolute -top-4 -right-4 bg-white text-black rounded-full w-10 h-10 shadow-lg text-2xl flex items-center justify-center"
            onclick="closeImageModal()">
      &times;
    </button>

    <!-- Modal Image -->
    <img id="modalImage" src="" 
         class="rounded-xl shadow-2xl border-4 border-white object-contain max-h-[90vh] max-w-full"/>

  </div>

</div>

<script>
function openImageModal(src) {
  document.getElementById('modalImage').src = src;
  document.getElementById('imageModal').classList.remove('hidden');
  document.getElementById('imageModal').classList.add('flex');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.add('hidden');
  document.getElementById('imageModal').classList.remove('flex');
}

// Close when clicking outside
document.getElementById('imageModal').addEventListener('click', function(e){
  if(e.target === this) closeImageModal();
});
</script>

</main>

<script>
// Server-side Live search & Infinite Scroll Logic
let currentPage = 1;
let loading = false;
let hasMore = true;
let currentSearch = '';

const searchInput = document.getElementById('searchInput');
if(searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          currentSearch = searchInput.value.trim();
          currentPage = 1;
          hasMore = true;
          document.querySelector('#tableBody').innerHTML = '';
          document.getElementById('mobileCards').innerHTML = '';
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
                const counter = document.getElementById('totalTransactionsCount');
                if (counter) counter.innerText = data.total;
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
            console.error('Error loading transactions:', err);
            loading = false;
        });
}
</script>

</body>
</html>

