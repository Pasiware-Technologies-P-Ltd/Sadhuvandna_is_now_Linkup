<?php
include("header.php");
// No need to include connection if header already did, but it's safe.

// Fetch counts dynamically
$newRegCount = mysqli_fetch_assoc(mysqli_query($con, "SELECT COUNT(*) as cnt FROM tbl_members WHERE status='Pending'"))['cnt'];
$approvedCount = mysqli_fetch_assoc(mysqli_query($con, "SELECT COUNT(*) as cnt FROM tbl_members WHERE status='Approved'"))['cnt'];
$blockedCount = mysqli_fetch_assoc(mysqli_query($con, "SELECT COUNT(*) as cnt FROM tbl_members WHERE status='Blocked'"))['cnt'];
$totalEarnings = mysqli_fetch_assoc(mysqli_query($con, "SELECT SUM(payment_ammount) as total FROM tbl_wallet WHERE status='success'"))['total'];
$totalEarnings = $totalEarnings ? $totalEarnings : 0;

$todayEarnings = mysqli_fetch_assoc(mysqli_query($con, "SELECT SUM(payment_ammount) as total FROM tbl_wallet WHERE status='success' AND DATE(date) = CURDATE()"))['total'];
$todayEarnings = $todayEarnings ? $todayEarnings : 0;

$chartLabels = [];
$regData = [];
$revData = [];
for($i=6; $i>=0; $i--) {
    $dateStr = date('Y-m-d', strtotime("-$i days"));
    $displayLabel = date('D', strtotime("-$i days"));
    $chartLabels[] = $displayLabel;
    
    $regQ = mysqli_query($con, "SELECT COUNT(*) as c FROM tbl_members WHERE DATE(date) = '$dateStr'");
    $regData[] = mysqli_fetch_assoc($regQ)['c'] ?? 0;
    
    $revQ = mysqli_query($con, "SELECT SUM(payment_ammount) as s FROM tbl_wallet WHERE DATE(date) = '$dateStr' AND status='success'");
    $revData[] = mysqli_fetch_assoc($revQ)['s'] ?? 0;
}
?>

<main class="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
 
  <!-- Welcome & Revenue Highlight -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      <!-- Welcome Banner (Spans 2 cols on lg) -->
      <div class="lg:col-span-2 rounded-2xl p-7 sm:p-8 text-white relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]" style="background: linear-gradient(135deg, #1877F2 0%, #2563EB 50%, #4f46e5 100%);">
          <!-- Decorative shapes -->
          <div class="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div class="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div class="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold tracking-wide uppercase text-blue-100 mb-3 border border-white/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <?= date('l, d F Y') ?>
                </div>
                <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Welcome Back, Admin! 👋</h2>
                <p class="text-blue-100/90 max-w-lg text-xs sm:text-sm leading-relaxed font-normal">Monitor your community members, review pending approvals, and moderate platform posts in real time.</p>
              </div>

              <div class="mt-6 flex flex-wrap items-center gap-3">
                <a href="admin_new_registration.php" class="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition shadow-sm">
                  <span>Review Pending</span>
                  <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]"><?= $newRegCount ?></span>
                </a>
                <a href="admin_all_community_member.php" class="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold backdrop-blur transition border border-white/20">
                  <i class="fa-solid fa-users text-xs"></i>
                  <span>All Members</span>
                </a>
              </div>
          </div>
      </div>

      <!-- Revenue Highlight Card -->
      <div class="rounded-2xl p-7 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)]" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
         <div class="absolute top-0 right-0 p-6 opacity-[0.06] pointer-events-none">
             <i class="fa-solid fa-wallet text-8xl"></i>
         </div>
         <div class="relative z-10 flex flex-col justify-between h-full">
             <div>
               <div class="flex items-center justify-between mb-3">
                   <div class="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                       <i class="fa-solid fa-indian-rupee-sign text-emerald-400"></i> Total Revenue
                   </div>
                   <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
               </div>
               <h3 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">₹<?= number_format($totalEarnings) ?></h3>
             </div>
             
             <div class="pt-4 border-t border-slate-700/60 flex justify-between items-end">
                 <div>
                     <p class="text-[11px] text-slate-400 mb-0.5 uppercase tracking-wider font-semibold">Today's Earnings</p>
                     <p class="text-lg font-bold text-emerald-400">+₹<?= number_format($todayEarnings) ?></p>
                 </div>
                 <a href="admin_wallet.php" class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-slate-200 hover:text-white border border-white/10" title="Wallet Details">
                     <i class="fa-solid fa-arrow-right text-xs"></i>
                 </a>
             </div>
         </div>
      </div>
  </div>

  <!-- Overview Stats -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
    
    <!-- New Registration -->
    <a href="admin_new_registration.php" class="premium-card p-5 flex items-center gap-4 hover:border-amber-300 transition-all duration-200 group">
      <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform flex-shrink-0">
        <i class="fa-solid fa-user-clock"></i>
      </div>
      <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Approval</p>
          <div class="flex items-baseline gap-2">
            <h3 class="text-2xl font-extrabold text-slate-900"><?= number_format($newRegCount) ?></h3>
            <span class="text-[11px] font-semibold text-amber-600">Needs Review</span>
          </div>
      </div>
      <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all text-xs"></i>
    </a>

    <!-- All Members -->
    <a href="admin_all_community_member.php" class="premium-card p-5 flex items-center gap-4 hover:border-blue-300 transition-all duration-200 group">
      <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform flex-shrink-0">
        <i class="fa-solid fa-users"></i>
      </div>
      <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Members</p>
          <div class="flex items-baseline gap-2">
            <h3 class="text-2xl font-extrabold text-slate-900"><?= number_format($approvedCount) ?></h3>
            <span class="text-[11px] font-semibold text-emerald-600">Verified</span>
          </div>
      </div>
      <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all text-xs"></i>
    </a>

    <!-- Blocked Members -->
    <a href="admin_block_user.php" class="premium-card p-5 flex items-center gap-4 hover:border-rose-300 transition-all duration-200 group">
      <div class="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center text-lg shadow-2xs group-hover:scale-105 transition-transform flex-shrink-0">
        <i class="fa-solid fa-user-slash"></i>
      </div>
      <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blocked Accounts</p>
          <div class="flex items-baseline gap-2">
            <h3 class="text-2xl font-extrabold text-slate-900"><?= number_format($blockedCount) ?></h3>
            <span class="text-[11px] font-semibold text-rose-600">Restricted</span>
          </div>
      </div>
      <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all text-xs"></i>
    </a>
  </div>

  <!-- Charts Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      
      <!-- Registrations Chart -->
      <div class="premium-card p-6">
          <div class="flex items-center justify-between mb-5">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Member Onboarding Trend</h3>
                <p class="text-[11px] text-slate-400 font-medium">Daily registered accounts</p>
              </div>
              <span class="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200/60">Last 7 Days</span>
          </div>
          <div class="relative h-64 w-full">
              <canvas id="regChart"></canvas>
          </div>
      </div>

      <!-- Revenue Chart -->
      <div class="premium-card p-6">
          <div class="flex items-center justify-between mb-5">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Revenue Flow</h3>
                <p class="text-[11px] text-slate-400 font-medium">Daily verified wallet credit</p>
              </div>
              <span class="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-full">Last 7 Days</span>
          </div>
          <div class="relative h-64 w-full">
              <canvas id="revChart"></canvas>
          </div>
      </div>
      
  </div>

</main>

<script>
// Parse data from PHP
const labels = <?= json_encode($chartLabels) ?>;
const regData = <?= json_encode($regData) ?>;
const revData = <?= json_encode($revData) ?>;

// Registration Line Chart
const ctxReg = document.getElementById('regChart').getContext('2d');
new Chart(ctxReg, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'New Users',
            data: regData,
            borderColor: '#2563EB', // Brand blue
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#2563EB',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { borderDash: [3, 3], color: '#f1f5f9' },
                ticks: { padding: 8, font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 }, color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { padding: 8, font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 }, color: '#94a3b8' }
            }
        },
        interaction: { mode: 'index', intersect: false }
    }
});

// Revenue Bar Chart
const ctxRev = document.getElementById('revChart').getContext('2d');
new Chart(ctxRev, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [{
            label: 'Revenue (₹)',
            data: revData,
            backgroundColor: '#10b981', // emerald-500
            borderRadius: 6,
            barThickness: 'flex',
            maxBarThickness: 28
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { borderDash: [3, 3], color: '#f1f5f9' },
                ticks: {
                    padding: 8,
                    font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 },
                    color: '#94a3b8',
                    callback: function(value) {
                        if (value >= 1000) return '₹' + (value/1000) + 'k';
                        return '₹' + value;
                    }
                }
            },
            x: {
                grid: { display: false },
                ticks: { padding: 8, font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 }, color: '#94a3b8' }
            }
        },
        interaction: { mode: 'index', intersect: false }
    }
});
</script>

</body>
</html>
