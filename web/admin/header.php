<?php
//session_start();
include("../connection.php");

if (!isset($_SESSION['admin_id'])) {

    // Check If Cookie Exists
    if (isset($_COOKIE['sadhu_admin_id']) && isset($_COOKIE['sadhu_admin_token'])) {

        $id = $_COOKIE['sadhu_admin_id'];
        $token = $_COOKIE['sadhu_admin_token'];

        $q = mysqli_query($con, "SELECT * FROM tbl_admin WHERE admin_id='$id' LIMIT 1");

        if (mysqli_num_rows($q) == 1) {
            $row = mysqli_fetch_assoc($q);

            // Verify Cookie Token
            if (sha1($row['password']) === $token) {

                // Auto-Login using Cookie
                $_SESSION['admin_id'] = $row['admin_id'];
                $_SESSION['admin_name'] = $row['username'];

            }
        }
    }
}

// Still not logged in → redirect to login
if (!isset($_SESSION['admin_id'])) {
    echo "<script>window.location.href = 'admin_login';</script>";
    exit;
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Linkup - Admin Dashboard</title>
  <link rel="icon" type="image/png" href="../images/logo.png"/>
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Tailwind CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <!-- Centralized Design System (All Colors, Components & Fonts) -->
  <link rel="stylesheet" href="../css/theme.css?v=<?= filemtime(__DIR__ . '/../css/theme.css') ?>"/>
  <!-- FontAwesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
  <!-- Chart.js CDN -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  
  <style>
    @media (min-width: 1024px) {
      body { padding-left: 17rem; } /* lg:pl-68 */
    }
    
    .sidebar-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.9rem;
        border-radius: 0.75rem;
        color: #475569;
        font-weight: 500;
        font-size: 0.84rem;
        transition: all 0.15s ease-in-out;
    }
    .sidebar-link i {
        color: #94a3b8;
        transition: color 0.15s ease-in-out;
    }
    .sidebar-link:hover {
        background-color: #f1f5f9;
        color: #0f172a;
    }
    .sidebar-link:hover i {
        color: var(--color-primary);
    }
    .sidebar-link.active {
        background: var(--brand-gradient);
        color: #ffffff;
        font-weight: 600;
        box-shadow: var(--brand-shadow);
    }
    .sidebar-link.active i {
        color: #ffffff;
    }
    .sidebar-section {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #94a3b8;
        margin-top: 1.35rem;
        margin-bottom: 0.4rem;
        padding-left: 0.75rem;
    }
  </style>
</head>
<body class="min-h-screen text-slate-800 antialiased selection:bg-blue-500 selection:text-white">

<!-- Sidebar -->
<aside id="adminSidebar" class="fixed inset-y-0 left-0 w-68 bg-white border-r border-slate-200/80 shadow-[1px_0_12px_rgba(0,0,0,0.02)] z-50 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 flex flex-col h-screen overflow-hidden">
    
    <!-- Sidebar Header (Aligned with top header height) -->
    <div class="h-16 px-5 flex items-center justify-between flex-shrink-0 bg-white border-b border-slate-200/80">
        <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-200 flex items-center justify-center bg-white p-0.5">
                 <img src="../images/logo.png" alt="Linkup Logo" class="w-full h-full object-cover rounded-lg">
            </div>
            <div>
              <span class="text-base font-extrabold tracking-tight text-slate-900 block leading-tight">Linkup</span>
              <span class="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">Admin Suite</span>
            </div>
        </div>
        <button onclick="toggleSidebar()" class="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
            <i class="fa-solid fa-times text-sm"></i>
        </button>
    </div>

    <!-- Sidebar Links (Scrollable area only below header) -->
    <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scroll">
        <?php $currentPage = basename($_SERVER['PHP_SELF']); ?>
        
        <a href="index.php" class="sidebar-link <?= ($currentPage == 'index.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-chart-pie w-5 text-center"></i>
            <span class="font-medium text-sm">Dashboard</span>
        </a>

        <div class="sidebar-section">Community</div>
        <a href="admin_new_registration.php" class="sidebar-link <?= ($currentPage == 'admin_new_registration.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-user-plus w-5 text-center"></i>
            <span class="font-medium text-sm">Pending Approvals</span>
        </a>
        <a href="admin_all_community_member.php" class="sidebar-link <?= ($currentPage == 'admin_all_community_member.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-users w-5 text-center"></i>
            <span class="font-medium text-sm">All Members</span>
        </a>
        <a href="admin_block_user.php" class="sidebar-link <?= ($currentPage == 'admin_block_user.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-user-slash w-5 text-center"></i>
            <span class="font-medium text-sm">Blocked Users</span>
        </a>
        <a href="admin_anchor_applications.php" class="sidebar-link <?= ($currentPage == 'admin_anchor_applications.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-microphone-lines w-5 text-center"></i>
            <span class="font-medium text-sm">Anchor Applications</span>
        </a>

        <div class="sidebar-section">Content</div>
        <a href="admin_post.php" class="sidebar-link <?= ($currentPage == 'admin_post.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-photo-film w-5 text-center"></i>
            <span class="font-medium text-sm">Manage Posts</span>
        </a>
        <a href="admin_reported_posts.php" class="sidebar-link <?= ($currentPage == 'admin_reported_posts.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-flag w-5 text-center"></i>
            <span class="font-medium text-sm">Reported Posts</span>
        </a>
        <a href="add_views_news.php" class="sidebar-link <?= ($currentPage == 'add_views_news.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-newspaper w-5 text-center"></i>
            <span class="font-medium text-sm">News Updates</span>
        </a>
        <a href="admin_jobs_education.php" class="sidebar-link <?= ($currentPage == 'admin_jobs_education.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-chalkboard-user w-5 text-center"></i>
            <span class="font-medium text-sm">Jobs & Education</span>
        </a>
        <a href="admin_gallery.php" class="sidebar-link <?= ($currentPage == 'admin_gallery.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-image w-5 text-center"></i>
            <span class="font-medium text-sm">Gallery</span>
        </a>
        <a href="upload_music.php" class="sidebar-link <?= ($currentPage == 'upload_music.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-music w-5 text-center"></i>
            <span class="font-medium text-sm">Music Management</span>
        </a>

        <div class="sidebar-section">Network</div>
        <a href="create_temple.php" class="sidebar-link <?= ($currentPage == 'create_temple.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-place-of-worship w-5 text-center"></i>
            <span class="font-medium text-sm">Temples</span>
        </a>
        <a href="create_branch.php" class="sidebar-link <?= ($currentPage == 'create_branch.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-code-branch w-5 text-center"></i>
            <span class="font-medium text-sm">Branches</span>
        </a>

        <div class="sidebar-section">Tools</div>
        <a href="admin_wallet.php" class="sidebar-link <?= ($currentPage == 'admin_wallet.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-wallet w-5 text-center"></i>
            <span class="font-medium text-sm">Wallet & Revenue</span>
        </a>
        <a href="admin_whatsapp_bulk.php" class="sidebar-link <?= ($currentPage == 'admin_whatsapp_bulk.php') ? 'active' : '' ?>">
            <i class="fa-brands fa-whatsapp w-5 text-center"></i>
            <span class="font-medium text-sm">Bulk WhatsApp</span>
        </a>
        <a href="admin_add_contact.php" class="sidebar-link <?= ($currentPage == 'admin_add_contact.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-address-book w-5 text-center"></i>
            <span class="font-medium text-sm">Contacts</span>
        </a>
        <a href="admin_festival_frames.php" class="sidebar-link <?= ($currentPage == 'admin_festival_frames.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-wand-magic-sparkles w-5 text-center"></i>
            <span class="font-medium text-sm">Festival Frames</span>
        </a>

        <div class="sidebar-section">Locations</div>
        <a href="create_state.php" class="sidebar-link <?= ($currentPage == 'create_state.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-map w-5 text-center"></i>
            <span class="font-medium text-sm">States</span>
        </a>
        <a href="create_district.php" class="sidebar-link <?= ($currentPage == 'create_district.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-map-pin w-5 text-center"></i>
            <span class="font-medium text-sm">Districts</span>
        </a>

        <div class="sidebar-section">System</div>
        <a href="admin_setting.php" class="sidebar-link <?= ($currentPage == 'admin_setting.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-gear w-5 text-center"></i>
            <span class="font-medium text-sm">Global Settings</span>
        </a>
    </nav>
</aside>

<!-- Overlay for mobile sidebar -->
<div id="sidebarOverlay" onclick="toggleSidebar()" class="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-40 hidden lg:hidden transition-opacity"></div>

<!-- Top Header (Main content area) -->
<header class="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 flex items-center">
  <div class="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
    
    <div class="flex items-center gap-3">
        <!-- Mobile Menu Toggle -->
        <button onclick="toggleSidebar()" class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            <i class="fa-solid fa-bars text-sm"></i>
        </button>
        <!-- Page Title Context -->
        <div>
            <h1 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">Admin Console</h1>
            <p class="text-[11px] text-slate-500 font-medium">Manage and monitor platform activity</p>
        </div>
    </div>
    
    <div class="flex items-center gap-3 sm:gap-4">
      
      <!-- Profile Dropdown -->
      <div class="relative">
        <button onclick="toggleProfileMenu()" class="flex items-center gap-2.5 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-slate-200 transition cursor-pointer">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              <i class="fa-solid fa-user-shield text-xs"></i>
            </div>
            <div class="hidden sm:block text-left">
                <p class="text-xs font-bold text-slate-800 leading-tight">Admin User</p>
                <p class="text-[10px] text-slate-400 font-medium leading-tight">Super Admin</p>
            </div>
            <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-0.5"></i>
        </button>
        
        <!-- Dropdown Menu -->
        <div id="profileMenu" class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden transition-all duration-200 origin-top-right transform scale-95 opacity-0 invisible">
          <a href="admin_change_password.php" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-blue-600 text-sm font-medium text-slate-600 transition">
            <i class="fa-solid fa-key w-4 text-center"></i>
            <span>Change Password</span>
          </a>
          <div class="h-px bg-slate-100 w-full"></div>
          <a href="admin_logout.php" class="flex items-center gap-3 px-4 py-3 hover:bg-red-50 hover:text-red-600 text-sm font-medium text-red-500 transition">
            <i class="fa-solid fa-right-from-bracket w-4 text-center"></i>
            <span>Sign Out</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</header>

<!-- JavaScript -->
<script>
  var profileMenuOpen = false;
  var sidebarOpen = false;

  // Profile menu toggle
  function toggleProfileMenu() {
    var menu = document.getElementById('profileMenu');
    
    if (profileMenuOpen) {
      menu.classList.add('opacity-0', 'invisible', 'scale-95');
      menu.classList.remove('opacity-100', 'visible', 'scale-100');
      profileMenuOpen = false;
    } else {
      menu.classList.remove('opacity-0', 'invisible', 'scale-95');
      menu.classList.add('opacity-100', 'visible', 'scale-100');
      profileMenuOpen = true;
    }
  }

  // Sidebar toggle for mobile
  function toggleSidebar() {
      var sidebar = document.getElementById('adminSidebar');
      var overlay = document.getElementById('sidebarOverlay');
      
      if(sidebarOpen) {
          sidebar.classList.add('-translate-x-full');
          overlay.classList.add('hidden');
          sidebarOpen = false;
      } else {
          sidebar.classList.remove('-translate-x-full');
          overlay.classList.remove('hidden');
          sidebarOpen = true;
      }
  }

  // Close menus when clicking outside
  document.addEventListener('click', function(event) {
    var profileButton = event.target.closest('button[onclick="toggleProfileMenu()"]');
    var menu = document.getElementById('profileMenu');
    
    if (!profileButton && !menu.contains(event.target) && profileMenuOpen) {
      toggleProfileMenu();
    }
  });

  // Toggle password visibility
  function togglePassword(inputId) {
    var input = document.getElementById(inputId);
    var icon = event.target.closest('button').querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }

  // Global Image Error Fallback - Prevents broken/broken-icon images across the entire Admin Panel
  window.addEventListener('error', function(e) {
    if (e.target && e.target.tagName === 'IMG') {
      var img = e.target;
      if (img.dataset.fallbackApplied) return; // Prevent infinite loop
      img.dataset.fallbackApplied = "true";

      // Try finding user name from closest row / card if it's a profile photo
      var row = img.closest('tr') || img.closest('.user-card') || img.closest('.mobile-card');
      var name = "";
      if (row) {
        var nameEl = row.querySelector('.font-semibold, h3, .font-bold');
        if (nameEl) name = nameEl.innerText.trim();
      }

      if (name && (img.classList.contains('view-photo') || img.classList.contains('rounded-full') || img.alt === 'photo')) {
        img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=1877F2&color=ffffff&bold=true';
      } else {
        // High quality placeholder SVG (camera icon placeholder with soft background)
        img.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Cpath d='M35 38l3-5h24l3 5h7a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5H28a5 5 0 0 1-5-5V43a5 5 0 0 1 5-5h7zm15 30a13 13 0 1 0 0-26 13 13 0 0 0 0 26zm0-5a8 8 0 1 1 0-16 8 8 0 0 1 0 16z' fill='%23d1d5db'/%3E%3C/svg%3E";
      }
    }
  }, true);

  // Global Modal Behavior: Click outside (on backdrop) or press Escape to close ANY modal
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('admin-modal-overlay')) {
      e.target.classList.remove('active');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.admin-modal-overlay.active').forEach(function(modal) {
        modal.classList.remove('active');
      });
    }
  });
</script>
