<?php
// Linkup Terms & Conditions
// Developed and operated by Pasiware Technologies Pvt. Ltd.
// Before publishing, replace the support email and verify all features/policies
// against the production application.

$company = 'Pasiware Technologies Pvt. Ltd.';
$appName = 'Linkup';
$website = 'https://www.sadhuvandna.co.in';
$supportEmail = 'REPLACE_WITH_OFFICIAL_SUPPORT_EMAIL';
$effectiveDate = '10 November 2026';
$lastUpdated = '10 November 2026';

function h(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index,follow">
<meta name="description" content="Terms and Conditions for Linkup, operated by Pasiware Technologies Pvt. Ltd.">
<meta name="theme-color" content="#111827">
<title>Terms &amp; Conditions | Linkup</title>
<style>
:root{--ink:#172033;--muted:#667085;--line:#e7eaf0;--brand:#6558e8;--brand2:#8b5cf6;--soft:#f5f6ff;--bg:#f7f8fc}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.72 Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}
.header{background:#111827;color:#fff}
.header-inner{max-width:980px;margin:auto;padding:22px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:12px;color:#fff}
.logo{width:43px;height:43px;border-radius:14px;background:linear-gradient(135deg,var(--brand),var(--brand2));display:grid;place-items:center;font-weight:800;font-size:21px}
.brand strong{display:block;font-size:21px;line-height:1.2}.brand small{display:block;color:#c7cbd5;font-size:12px;margin-top:3px}
.pill{font-size:12px;color:#e5e7eb;border:1px solid #ffffff35;padding:7px 12px;border-radius:999px}
.container{max-width:900px;margin:34px auto;padding:0 22px}
.document{background:#fff;border:1px solid var(--line);border-radius:20px;padding:clamp(24px,5vw,52px);box-shadow:0 10px 34px #1720330a}
.eyebrow{display:inline-block;background:var(--soft);color:var(--brand);padding:6px 12px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.5px}
h1{font-size:clamp(30px,5vw,42px);line-height:1.15;letter-spacing:-1px;margin:18px 0 8px}
.meta{font-size:13px;color:var(--muted);margin-bottom:28px}
h2{font-size:20px;line-height:1.35;margin:30px 0 8px;letter-spacing:-.2px}
p{margin:9px 0 14px;color:#394355}
ul{padding-left:23px;color:#394355}li{margin:6px 0;padding-left:3px}
.notice{background:#f8f7ff;border:1px solid #e6e2ff;border-left:4px solid var(--brand);padding:15px 17px;border-radius:12px;margin:20px 0;color:#42405c}
.contact{background:#f8fafc;border:1px solid var(--line);padding:18px;border-radius:14px;margin-top:25px}
.footer{max-width:900px;margin:0 auto;padding:0 22px 32px;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:600px){.header-inner{padding:17px}.pill{display:none}.container{margin:18px auto;padding:0 12px}.document{padding:25px 20px}.footer{padding:0 14px 24px}}
</style>
</head>
<body>
<header class="header">
  <div class="header-inner">
    <a class="brand" href="<?= h($website) ?>" aria-label="Linkup">
      <span class="logo">L</span>
      <span><strong>Linkup</strong><small>Connect. Share. Belong.</small></span>
    </a>
    <span class="pill">Official Legal Document</span>
  </div>
</header>

<main class="container">
<article class="document">
<span class="eyebrow">LINKUP · LEGAL</span>
<h1>Terms &amp; Conditions</h1>
<div class="meta">Effective Date: <?= h($effectiveDate) ?> · Last Updated: <?= h($lastUpdated) ?></div>

<p>Welcome to <?= h($appName) ?>, a social networking application developed and operated by <?= h($company) ?> (“Company”, “we”, “our” or “us”). These Terms and Conditions govern your access to and use of the Linkup application and related services.</p>
<p>Linkup allows users to create profiles, share posts, photos, videos and stories, follow other users, interact through likes and comments, and communicate through private messaging. By registering for or using Linkup, you agree to these Terms, our Privacy Policy and our Community Guidelines. If you do not agree, do not use the service.</p>

<h2>1. Eligibility and Age Requirement</h2>
<ul>
<li>Linkup is intended only for individuals aged 18 years or older.</li>
<li>Individuals under 18 are not permitted to register for or use Linkup.</li>
<li>You must provide accurate information and use a mobile number you are authorised to use.</li>
<li>You must not create an account using another person's identity or information without authorisation.</li>
</ul>

<h2>2. Account Registration and Security</h2>
<p>Linkup uses mobile number and one-time password (OTP) verification for login. You are responsible for protecting access to your account and keeping OTPs confidential. Do not share your OTP with anyone. Notify us promptly if you suspect unauthorised access to your account.</p>

<h2>3. Acceptable Use</h2>
<p>You agree to use Linkup lawfully and respectfully. You must not:</p>
<ul>
<li>Harass, threaten, bully, intimidate or target other users.</li>
<li>Publish hate speech, discriminatory abuse, sexually exploitative or otherwise prohibited content.</li>
<li>Upload illegal content or content that promotes serious violence or exploitation.</li>
<li>Impersonate another person or organisation or create deceptive accounts.</li>
<li>Distribute spam, scams, phishing links, malware or fraudulent offers.</li>
<li>Share another person's private information or images without proper authorisation.</li>
<li>Infringe copyright, trademarks, privacy or other legal rights.</li>
<li>Manipulate likes, comments or followers using bots, fake accounts or deceptive methods.</li>
<li>Attempt to hack, disrupt, reverse engineer or compromise Linkup, except where such restriction is prohibited by law.</li>
</ul>

<h2>4. User-Generated Content and Ownership</h2>
<p>You remain responsible for content you create, upload or share, including posts, photos, videos, stories and comments. You must own the content or have all permissions necessary to share it, and it must not violate applicable law or another person's rights.</p>
<p>You retain ownership of your original content. By uploading content, you grant <?= h($company) ?> a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, display and transmit that content only as necessary to operate, maintain, secure and provide the Linkup features you use. This licence is subject to your applicable privacy settings and ends when the content is deleted, except for limited retention or processing permitted or required by law, security needs or backups.</p>

<h2>5. Posts, Photos, Videos and Stories</h2>
<p>Content visibility depends on the features and settings available in the application. You should not publish information you want to keep confidential. You are responsible for ensuring that your content is lawful, appropriate and does not infringe the rights or privacy of others. We may restrict or remove content that violates these Terms, our Community Guidelines or applicable law.</p>

<h2>6. Likes, Comments and Following</h2>
<p>Likes, comments and following features must not be used to harass, threaten, spam, manipulate engagement or repeatedly disturb other users. We may restrict accounts that misuse these features.</p>

<h2>7. Private Messaging</h2>
<p>Private messaging must not be used for harassment, threats, blackmail, fraud, spam, malicious links or unlawful content. Users may report inappropriate messages and block accounts through the available application features. Messages are intended for the relevant conversation participants, but recipients may copy, screenshot or share them. Do not assume messages are end-to-end encrypted unless Linkup expressly provides and discloses that feature.</p>

<h2>8. Community Guidelines and Moderation</h2>
<p>All users must follow Linkup's Community Guidelines. We may review user reports and remove content or restrict accounts that violate these Terms, the Community Guidelines or applicable law. Depending on the seriousness and frequency of a violation, actions may include warnings, content removal, feature restrictions, temporary suspension or permanent termination. Where legally required, unlawful conduct may be referred to appropriate authorities.</p>

<h2>9. Reporting and Blocking</h2>
<p>Use the reporting tools available in Linkup to report inappropriate posts, photos, videos, stories, comments, profiles or private messages. You may block accounts to limit unwanted interactions. We will review reports and take action as appropriate based on the information available and the seriousness of the issue.</p>

<h2>10. Intellectual Property</h2>
<p>The Linkup name, logo, software, design, interface, branding and platform materials are owned by or licensed to <?= h($company) ?>. You may not copy, distribute, modify or commercially exploit these materials without permission, except where permitted by applicable law.</p>

<h2>11. Account Suspension and Termination</h2>
<p>We may restrict, suspend or terminate access where an account violates these Terms or Community Guidelines, engages in fraud or impersonation, threatens user safety, compromises platform security or violates applicable law. The action taken will depend on the circumstances and applicable legal requirements. Users may stop using Linkup and request account deletion using the designated process.</p>

<h2>12. Account Deletion</h2>
<p>You may request permanent account deletion through the account deletion option in Linkup's account settings. You may also use our designated account deletion webpage:</p>
<p><a href="linkup-policies.php?page=deletion">Linkup Account Deletion Instructions</a></p>
<p>Deleting the application from your device or logging out does not delete your account. Deletion requests will be handled under our Privacy Policy and applicable law. Certain information may be retained where legally required or reasonably necessary for security, fraud prevention, dispute resolution or legal compliance.</p>

<h2>13. Third-Party Services</h2>
<p>Linkup may rely on third-party providers for hosting, OTP delivery, media storage, notifications, diagnostics and other technical services. Third-party services may be subject to their own terms and privacy notices. We are not responsible for independent services outside our reasonable control.</p>

<h2>14. Service Availability and Changes</h2>
<p>We may update, maintain, modify, temporarily suspend or discontinue features to operate and improve Linkup. We aim to provide a reliable service but do not guarantee uninterrupted or error-free availability. Maintenance, technical failures, security incidents or circumstances beyond our reasonable control may affect availability.</p>

<h2>15. Disclaimer</h2>
<p>To the extent permitted by applicable law, Linkup is provided on an “as available” basis. We do not guarantee the accuracy, reliability or authenticity of user-generated content. Users are responsible for evaluating content and interactions with other users. The Company does not endorse every statement or item of content posted by users.</p>

<h2>16. Limitation of Liability</h2>
<p>To the extent permitted by applicable law, <?= h($company) ?> will not be liable for indirect or consequential losses arising from user-generated content, third-party conduct or temporary service interruptions. Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited.</p>

<h2>17. Privacy and Data Protection</h2>
<p>Your use of Linkup is also governed by our <a href="linkup-policies.php?page=privacy">Privacy Policy</a>, which explains how personal information is handled. Please review it before using the application.</p>

<h2>18. Changes to These Terms</h2>
<p>We may revise these Terms from time to time. Updated versions will be published on our official policy website with a revised “Last Updated” date. Where required by law, we will provide notice of material changes and obtain consent where necessary.</p>

<h2>19. Governing Law and Jurisdiction</h2>
<p>These Terms are governed by the laws of India. Disputes arising from the use of Linkup will be subject to the jurisdiction of competent courts in India, subject to applicable law.</p>

<div class="contact">
<h2>20. Contact Information</h2>
<p><strong><?= h($company) ?></strong><br>
Application: <?= h($appName) ?><br>
Country: India<br>
Website: <a href="<?= h($website) ?>"><?= h($website) ?></a><br>
<?php if ($supportEmail === 'REPLACE_WITH_OFFICIAL_SUPPORT_EMAIL'): ?>
<span style="color:#a33;font-weight:700">sadhuvandna23@gmail.com</span>
<?php else: ?>
Support Email: <a href="mailto:<?= h($supportEmail) ?>"><?= h($supportEmail) ?></a>
<?php endif; ?>
</p>
</div>
<p><strong>© <?= date('Y') ?> <?= h($company) ?>. All Rights Reserved.</strong><br><?= h($appName) ?> – Connect. Share. Belong.</p>
</article>
</main>

<footer class="footer">
<span>© <?= date('Y') ?> <?= h($company) ?></span>
<span><a href="linkup-policies.php?page=privacy">Privacy Policy</a> · <a href="linkup-policies.php?page=community">Community Guidelines</a> · <a href="linkup-policies.php?page=deletion">Account Deletion</a></span>
</footer>
</body>
</html>
