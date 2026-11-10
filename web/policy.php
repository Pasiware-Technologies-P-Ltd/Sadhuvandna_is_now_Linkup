<?php
/*
 * LINKUP POLICY PAGES
 * Developed for Pasiware Technologies Pvt. Ltd.
 *
 * Upload this file as linkup-policies.php to your PHP hosting.
 * Update SUPPORT_EMAIL and confirm the technical/data-handling statements
 * match the app and every SDK/service before publishing.
 */

declare(strict_types=1);

const APP_NAME = 'Linkup';
const COMPANY_NAME = 'Pasiware Technologies Pvt. Ltd.';
const WEBSITE_URL = 'https://www.sadhuvandna.co.in';
const SUPPORT_EMAIL = 'REPLACE_WITH_OFFICIAL_SUPPORT_EMAIL';
const EFFECTIVE_DATE = '10 November 2026';
const LAST_UPDATED = '10 November 2026';

$pages = [
    'privacy' => 'Privacy Policy',
    'terms' => 'Terms & Conditions',
    'community' => 'Community Guidelines',
    'deletion' => 'Account Deletion',
];

$page = isset($_GET['page']) && is_string($_GET['page']) ? $_GET['page'] : 'privacy';
if (!array_key_exists($page, $pages)) {
    http_response_code(404);
    $page = 'privacy';
}

function e(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function support_email(): string {
    return SUPPORT_EMAIL;
}

function contact_line(): string {
    if (SUPPORT_EMAIL === 'REPLACE_WITH_OFFICIAL_SUPPORT_EMAIL') {
        return 'Please replace the support email placeholder in this PHP file before publishing.';
    }
    return 'For privacy requests and support, email ' . SUPPORT_EMAIL . '.';
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#111827">
  <title><?= e($pages[$page]) ?> | Linkup</title>
  <meta name="description" content="Official <?= e($pages[$page]) ?> for Linkup, operated by Pasiware Technologies Pvt. Ltd.">
  <style>
    :root{--ink:#172033;--muted:#667085;--line:#e7eaf0;--brand:#6558e8;--brand2:#8b5cf6;--soft:#f5f6ff;--bg:#f7f8fc}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.72 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
    a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}
    .top{background:#111827;color:#fff}
    .top-inner{max-width:1120px;margin:auto;padding:22px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px}
    .brand{display:flex;align-items:center;gap:12px;color:#fff;text-decoration:none}
    .logo{width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,var(--brand),var(--brand2));display:grid;place-items:center;font-weight:800;font-size:20px;box-shadow:0 8px 22px #6558e855}
    .brand strong{display:block;font-size:21px;letter-spacing:.2px;line-height:1.2}
    .brand small{display:block;color:#c7cbd5;font-size:12px;margin-top:3px}
    .top-tag{font-size:12px;color:#d7d9e2;border:1px solid #ffffff30;padding:7px 11px;border-radius:999px}
    .wrap{max-width:1120px;margin:34px auto;padding:0 24px;display:grid;grid-template-columns:250px minmax(0,1fr);gap:26px;align-items:start}
    .nav,.content{background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:0 8px 30px #17203308}
    .nav{padding:18px;position:sticky;top:20px}
    .nav h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:4px 10px 12px}
    .nav a{display:block;padding:11px 12px;border-radius:11px;color:#344054;font-weight:600;font-size:14px;margin:3px 0}
    .nav a.active,.nav a:hover{background:var(--soft);color:var(--brand);text-decoration:none}
    .content{padding:clamp(24px,4vw,48px);min-width:0}
    .eyebrow{display:inline-flex;background:var(--soft);color:var(--brand);padding:6px 11px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.4px}
    h1{font-size:clamp(30px,4vw,42px);line-height:1.15;letter-spacing:-1px;margin:18px 0 8px}
    .meta{font-size:13px;color:var(--muted);margin-bottom:28px}
    h2{font-size:21px;line-height:1.3;margin:32px 0 10px;letter-spacing:-.3px}
    h3{font-size:17px;margin:22px 0 8px}
    p{margin:9px 0 14px;color:#394355}
    ul,ol{padding-left:23px;color:#394355}
    li{padding-left:4px;margin:6px 0}
    .notice{background:#f8f7ff;border:1px solid #e6e2ff;border-left:4px solid var(--brand);padding:15px 17px;border-radius:12px;margin:20px 0;color:#42405c}
    .contact{background:#f8fafc;border:1px solid var(--line);padding:18px;border-radius:14px;margin-top:24px}
    .footer{max-width:1120px;margin:0 auto;padding:0 24px 34px;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .footer a{margin-right:12px}
    .placeholder{color:#a33;font-weight:700}
    @media(max-width:760px){.wrap{grid-template-columns:1fr;margin:18px auto;gap:14px}.nav{position:static;padding:12px}.nav h3{margin:5px 8px}.nav-links{display:grid;grid-template-columns:1fr 1fr;gap:2px}.nav a{font-size:13px;padding:9px}.top-inner{padding:17px 18px}.top-tag{display:none}.content{padding:25px 21px}.footer{padding-bottom:24px}}
  </style>
</head>
<body>
<header class="top">
  <div class="top-inner">
    <a class="brand" href="?page=privacy" aria-label="Linkup policies home">
      <span class="logo">L</span>
      <span><strong>Linkup</strong><small>Connect. Share. Belong.</small></span>
    </a>
    <span class="top-tag">Official Policies</span>
  </div>
</header>

<div class="wrap">
  <aside class="nav" aria-label="Policy navigation">
    <h3>Legal & Safety</h3>
    <div class="nav-links">
      <?php foreach ($pages as $slug => $label): ?>
        <a class="<?= $page === $slug ? 'active' : '' ?>" href="?page=<?= e($slug) ?>" <?= $page === $slug ? 'aria-current="page"' : '' ?>><?= e($label) ?></a>
      <?php endforeach; ?>
    </div>
  </aside>

  <main class="content">
    <span class="eyebrow">LINKUP · OFFICIAL DOCUMENT</span>

    <?php if ($page === 'privacy'): ?>
      <h1>Privacy Policy</h1>
      <div class="meta">Effective Date: <?= e(EFFECTIVE_DATE) ?> · Last Updated: <?= e(LAST_UPDATED) ?></div>
      <p>Linkup is a social networking application developed and operated by <?= e(COMPANY_NAME) ?> (“Company”, “we”, “our” or “us”). This Privacy Policy explains how information is collected, used, stored, disclosed and protected when you use Linkup.</p>
      <p>Linkup currently offers mobile number and OTP login, profiles, posts, photos, videos, likes, comments, followers, stories and private messaging. Please read this policy together with our <a href="?page=terms">Terms & Conditions</a> and <a href="?page=community">Community Guidelines</a>.</p>

      <h2>1. Information We Collect</h2>
      <h3>1.1 Account and authentication information</h3>
      <p>We may collect your mobile number, OTP verification status, unique user ID, username, display name, account creation details and login/security records to create, authenticate and maintain your account.</p>
      <h3>1.2 Profile information</h3>
      <p>You may choose to provide a profile photo, display name, username, biography and other profile details. Visibility depends on the app's features and settings.</p>
      <h3>1.3 Content and interactions</h3>
      <p>We process content you upload or create, including text posts, photos, videos, stories, comments, replies, likes, reactions and follower relationships, to provide social networking features and enforce platform rules.</p>
      <h3>1.4 Private messages</h3>
      <p>When you use private messaging, we may process message content, sender and recipient identifiers, timestamps and delivery or technical information to provide the messaging service, protect users and investigate reports. Messages are intended for conversation participants. Recipients may copy, screenshot or share messages. Unless the app specifically implements and discloses end-to-end encryption, Linkup does not claim that messages are end-to-end encrypted.</p>
      <h3>1.5 Device and technical information</h3>
      <p>Depending on the app configuration and integrated services, we may collect device type, operating system, app version, IP address, permitted device or app identifiers, crash diagnostics, performance data and security logs.</p>
      <h3>1.6 Location information</h3>
      <p>Linkup does not request precise GPS location as part of the features described in this policy. Do not add location-related claims or permissions unless the app's actual code and SDKs support this statement.</p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>Create, authenticate and manage accounts using mobile OTP verification.</li>
        <li>Display profiles and content to the intended audience.</li>
        <li>Enable posts, photos, videos, stories, likes, comments, follows and private messages.</li>
        <li>Maintain service reliability, troubleshoot errors and improve performance.</li>
        <li>Detect spam, fraud, impersonation, abuse and security incidents.</li>
        <li>Review reports, enforce our policies and provide customer support.</li>
        <li>Meet applicable legal obligations and respond to lawful requests.</li>
      </ul>

      <h2>3. Public Content and Privacy</h2>
      <p>Content you publish may be visible to other users depending on the app's actual audience and privacy controls. Do not post information you want to keep confidential. Other users may capture or redistribute content they can see.</p>
      <p>Private messages are intended for the participants in a conversation, but recipients may copy, screenshot or share them. We may access or disclose relevant information when necessary to investigate reports, address safety issues, enforce our terms or comply with law.</p>

      <h2>4. Sharing of Information</h2>
      <p>We do not sell users' personal information. We may share information with service providers that support hosting, databases, OTP/SMS delivery, media storage and delivery, notifications, security, diagnostics and technical operations. They should process information only for the services they provide to us and under appropriate safeguards.</p>
      <p>We may also disclose information when required by law or valid legal process, or when reasonably necessary to protect users, the Company, platform security or legal rights. In a merger, restructuring or business transfer, information may be transferred subject to applicable law.</p>

      <h2>5. Data Security</h2>
      <p>We use reasonable technical and organisational safeguards appropriate to the information and risks, which may include access controls, authentication protections, server security, monitoring, backups and encryption where appropriate and supported. No online service can guarantee absolute security. Never share your OTP with anyone.</p>

      <h2>6. Data Retention</h2>
      <p>We retain information for as long as reasonably necessary to provide Linkup, maintain security, resolve disputes and meet legal obligations. Retention periods differ by data type. When information is no longer required, we delete, anonymise or securely dispose of it, subject to lawful retention requirements.</p>

      <h2>7. Account and Data Deletion</h2>
      <p>You can request deletion using the in-app account deletion feature or the instructions on our <a href="?page=deletion">Account Deletion</a> page. Deletion should cover the account and associated personal information, subject to applicable legal retention exceptions. Removing the app from your device does not delete your account.</p>
      <div class="notice"><strong>Before publishing:</strong> Make sure the in-app deletion flow works and add a public, working web account-deletion URL in the relevant app-store console. State a real processing period only after confirming it operationally.</div>

      <h2>8. Minimum Age</h2>
      <p>Linkup is intended only for people aged 18 years or older. Individuals under 18 are not permitted to create or use an account. If we become aware that an account belongs to someone under 18, we may restrict or terminate it and take appropriate steps regarding associated information.</p>

      <h2>9. Your Privacy Rights</h2>
      <p>Subject to applicable law, you may request access to, correction of or deletion of your personal information, withdraw consent where processing is based on consent, and raise concerns or complaints about processing. We will handle requests under applicable law and may need to verify your identity.</p>

      <h2>10. Third-Party Services</h2>
      <p>Linkup may use third-party infrastructure and technical services. Their processing may be governed by their own terms and privacy notices. Our app-store disclosures should identify the third-party SDKs and data practices actually present in the released app.</p>

      <h2>11. Changes to This Policy</h2>
      <p>We may update this policy to reflect changes in Linkup, our practices or legal requirements. We will publish the revised version here and update the “Last Updated” date.</p>

      <div class="contact"><h2>12. Contact and Privacy Complaints</h2><p><strong><?= e(COMPANY_NAME) ?></strong><br>Application: Linkup<br>Website: <a href="<?= e(WEBSITE_URL) ?>"><?= e(WEBSITE_URL) ?></a><br><?= e(contact_line()) ?></p></div>

    <?php elseif ($page === 'terms'): ?>
      <h1>Terms & Conditions</h1>
      <div class="meta">Effective Date: <?= e(EFFECTIVE_DATE) ?> · Last Updated: <?= e(LAST_UPDATED) ?></div>
      <p>These Terms govern your access to and use of Linkup, operated by <?= e(COMPANY_NAME) ?>. By creating an account or using Linkup, you agree to these Terms, our <a href="?page=privacy">Privacy Policy</a> and our <a href="?page=community">Community Guidelines</a>.</p>
      <h2>1. Eligibility and Registration</h2>
      <ul><li>You must be at least 18 years old to use Linkup.</li><li>Provide accurate information and use a mobile number you are authorised to use.</li><li>Do not impersonate another person or create accounts for fraudulent purposes.</li></ul>
      <h2>2. Account Security</h2>
      <p>You are responsible for protecting access to your account and OTPs. Do not share verification codes. Notify us promptly if you suspect unauthorised access.</p>
      <h2>3. Acceptable Use</h2>
      <p>You must use Linkup lawfully and respectfully. You must not harass, threaten, bully, exploit, defraud, impersonate, spam, distribute malware, infringe intellectual property, invade privacy or publish content prohibited by our Community Guidelines or applicable law.</p>
      <h2>4. User Content and Licence</h2>
      <p>You retain ownership of content you lawfully create and upload. You represent that you have the rights and permissions needed to share it. By uploading content, you grant <?= e(COMPANY_NAME) ?> a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, display and transmit that content only as necessary to operate, secure and provide the Linkup features you use, subject to your settings and applicable law. This licence ends when the content is deleted, except for limited continued processing or retention permitted or required by law, security needs or backups.</p>
      <h2>5. Private Messaging</h2>
      <p>Do not use private messages to harass, threaten, blackmail, scam or send unlawful material. Use available reporting and blocking features. Do not assume recipients will keep messages confidential.</p>
      <h2>6. Moderation and Enforcement</h2>
      <p>We may review reports and remove or restrict content or accounts that violate these Terms, our Community Guidelines or applicable law. Depending on severity and recurrence, actions may include warnings, content removal, feature restrictions, temporary suspension or permanent termination. Where required, unlawful conduct may be referred to appropriate authorities.</p>
      <h2>7. Reporting and Blocking</h2>
      <p>Use the in-app tools to report content or accounts and block users. We will review reports and take action as appropriate. Do not misuse reporting tools to harass others or submit knowingly false reports.</p>
      <h2>8. Intellectual Property</h2>
      <p>Linkup software, branding, logos, design and platform materials are owned by or licensed to <?= e(COMPANY_NAME) ?>. You may not copy, modify, reverse engineer or commercially exploit them except as permitted by law or with our written permission.</p>
      <h2>9. Availability and Disclaimer</h2>
      <p>Linkup is provided on an “as available” basis. We do not guarantee uninterrupted or error-free service or the accuracy of user-generated content. We may update, maintain or modify features from time to time.</p>
      <h2>10. Limitation of Liability</h2>
      <p>To the extent permitted by applicable law, <?= e(COMPANY_NAME) ?> will not be liable for indirect or consequential losses arising from user-generated content, third-party conduct or temporary service interruptions. Nothing in these Terms excludes liability that cannot legally be excluded.</p>
      <h2>11. Changes and Termination</h2>
      <p>We may update these Terms and publish the revised version here. You may stop using Linkup and request account deletion through the in-app process or our <a href="?page=deletion">Account Deletion</a> page. We may restrict or terminate access for serious or repeated violations, subject to applicable law.</p>
      <h2>12. Governing Law</h2>
      <p>These Terms are governed by the laws of India. Courts with competent jurisdiction in India will have jurisdiction, subject to applicable law.</p>
      <div class="contact"><h2>13. Contact</h2><p><strong><?= e(COMPANY_NAME) ?></strong><br>Website: <a href="<?= e(WEBSITE_URL) ?>"><?= e(WEBSITE_URL) ?></a><br><?= e(contact_line()) ?></p></div>

    <?php elseif ($page === 'community'): ?>
      <h1>Community Guidelines</h1>
      <div class="meta">Effective Date: <?= e(EFFECTIVE_DATE) ?> · Last Updated: <?= e(LAST_UPDATED) ?></div>
      <p>Linkup aims to provide a safe and respectful place for people aged 18 and above to connect, share posts, photos, videos and stories, and communicate. Everyone using Linkup must follow these Guidelines.</p>
      <h2>1. Respect Others</h2>
      <p>Harassment, bullying, threats, targeted abuse, hate speech and discriminatory attacks are not allowed.</p>
      <h2>2. Sexual and Exploitative Content</h2>
      <p>Do not post pornography, sexually explicit material, non-consensual intimate imagery, sexual exploitation content or any sexual content involving minors. Child sexual abuse material and grooming are strictly prohibited and may be escalated to appropriate authorities.</p>
      <h2>3. Violence and Illegal Activity</h2>
      <p>Do not promote serious violence, exploitation, criminal activity or dangerous unlawful conduct.</p>
      <h2>4. Authenticity and Impersonation</h2>
      <p>Do not impersonate another person or organisation, create deceptive fake profiles, or use another person's images in a misleading way without permission.</p>
      <h2>5. Spam, Scams and Manipulation</h2>
      <p>Do not send bulk unsolicited messages, phishing links, fraudulent offers, malicious links, or use bots and deceptive methods to manipulate likes, comments or followers.</p>
      <h2>6. Privacy</h2>
      <p>Do not share another person's private phone number, address, private images, confidential conversations or sensitive personal information without permission or a lawful basis.</p>
      <h2>7. Copyright and Intellectual Property</h2>
      <p>Only upload content you own or are authorised to use. Content that infringes copyright, trademarks or other rights may be removed after review.</p>
      <h2>8. Private Chat</h2>
      <p>Do not use private messaging to threaten, harass, blackmail, exploit, scam or send prohibited material. Users should report and block abusive accounts.</p>
      <h2>9. Reporting and Blocking</h2>
      <p>Report inappropriate posts, photos, videos, stories, comments, profiles and private messages using the available in-app reporting controls. Block accounts to limit unwanted interactions.</p>
      <h2>10. Moderation and Enforcement</h2>
      <p>We may review reports and take proportionate action, including removing content, issuing warnings, restricting features, suspending accounts or permanently terminating accounts. Serious violations may result in immediate restrictions and, where required, referral to relevant authorities.</p>
      <h2>11. Help Keep Linkup Safe</h2>
      <p>Do not engage with harmful content. Report violations and treat other users respectfully. These Guidelines may be updated as Linkup evolves.</p>
      <div class="contact"><h2>Contact</h2><p><?= e(COMPANY_NAME) ?><br><?= e(contact_line()) ?></p></div>

    <?php elseif ($page === 'deletion'): ?>
      <h1>Account Deletion</h1>
      <div class="meta">Effective Date: <?= e(EFFECTIVE_DATE) ?> · Last Updated: <?= e(LAST_UPDATED) ?></div>
      <p>Linkup users can request permanent deletion of their account and associated personal information. Uninstalling the app or logging out does not delete an account.</p>
      <h2>1. Delete from the Linkup App</h2>
      <ol><li>Open Linkup and sign in.</li><li>Open your Profile or Account Settings.</li><li>Select the Delete Account option.</li><li>Review the deletion information and verify your identity if requested.</li><li>Confirm your request.</li></ol>
      <div class="notice"><strong>Developer action required:</strong> The in-app steps above must match the actual screens and the deletion option must be implemented before this page is published. Do not publish instructions for a feature that is not available.</div>
      <h2>2. Request Deletion by Email</h2>
      <p>If you cannot access the app, contact our support team using the official email address listed below. Use the subject “Linkup Account Deletion Request” and provide the mobile number linked to your account, including country code. Do not send your OTP or password. We may ask for reasonable verification to protect your account.</p>
      <?php if (SUPPORT_EMAIL !== 'REPLACE_WITH_OFFICIAL_SUPPORT_EMAIL'): ?>
        <p><a href="mailto:<?= e(SUPPORT_EMAIL) ?>?subject=Linkup%20Account%20Deletion%20Request">Email a deletion request to <?= e(SUPPORT_EMAIL) ?></a></p>
      <?php else: ?>
        <p class="placeholder">Support email is not configured. Replace SUPPORT_EMAIL in this PHP file before publishing this page.</p>
      <?php endif; ?>
      <h2>3. What Happens After a Valid Request</h2>
      <p>We will verify the request where reasonably necessary and process deletion of the account and associated personal information from active systems, subject to applicable law. Content associated with the account, including profile information, posts, photos, videos, stories and comments, will be deleted or otherwise handled as required by law and the app's deletion design.</p>
      <h2>4. Information That May Be Retained</h2>
      <p>Limited information may be retained where necessary to comply with law, prevent fraud or abuse, maintain security, resolve disputes, or establish or defend legal claims. Retained information will be restricted and kept only for the applicable period.</p>
      <h2>5. Processing Time</h2>
      <p>Requests will be processed within the period required by applicable law and the Company's disclosed operational process. The Company should publish a specific processing period only after confirming that it can consistently meet it.</p>
      <div class="contact"><h2>Contact</h2><p><strong><?= e(COMPANY_NAME) ?></strong><br>Website: <a href="<?= e(WEBSITE_URL) ?>"><?= e(WEBSITE_URL) ?></a><br><?= e(contact_line()) ?></p></div>
    <?php endif; ?>
  </main>
</div>

<footer class="footer">
  <div>© <?= date('Y') ?> <?= e(COMPANY_NAME) ?>. All rights reserved.</div>
  <div>
    <a href="?page=privacy">Privacy</a>
    <a href="?page=terms">Terms</a>
    <a href="?page=community">Guidelines</a>
    <a href="?page=deletion">Delete Account</a>
  </div>
</footer>
</body>
</html>
