<?php
/**
 * send_notifications.php
 * Runs every 30 minutes via cron. Sends reminders to users whose
 * notification_preferences.message_frequency is due at the current time.
 */

//if (php_sapi_name() !== 'cli') {
  //  exit("This script must be run from the command line.\n");
//}

date_default_timezone_set('America/New_York'); // match what users expect

require_once __DIR__ . '/PHPMailer/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/SMTP.php';
require __DIR__ . '/db.php';
$config = require __DIR__ . '/mail_config.php';


use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ── Prevent overlapping runs ─────────────────────────────────────────────────
$lock = fopen(sys_get_temp_dir() . '/vitals_notify.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
    error_log("send_notifications.php: Another run is in progress. Exiting.");
    exit(0);
}

// ── Work out which frequencies are due right now ─────────────────────────────
$hour   = (int)date('G');
$minute = (int)date('i');
$slot   = ($minute >= 30) ? 30 : 0;   // tolerate cron firing a few seconds late

$dueFrequencies = [];

if ($slot === 0) {
    $dueFrequencies[] = 'every_hour';
    if ($hour === 12)               
        $dueFrequencies[] = 'once_daily_noon';
    if ($hour === 8 || $hour === 20) 
        $dueFrequencies[] = 'twice_daily';
}
$dueFrequencies[] = 'every_30_minutes'; // due at both :00 and :30

error_log(sprintf(
    "send_notifications.php: %s -> due: %s",
    date('Y-m-d H:i'), implode(', ', $dueFrequencies)
));

// ── Query users ──────────────────────────────────────────────────────────────
try {
    $placeholders = implode(',', array_fill(0, count($dueFrequencies), '?'));
    $stmt = $pdo->prepare("
        SELECT u.name, u.email
        FROM notification_preferences np
        JOIN users u ON u.id = np.uid
        WHERE np.email_notifications = 1
        AND np.message_frequency IN ($placeholders)
    ");
    $stmt->execute($dueFrequencies);
    $users = $stmt->fetchAll();
} catch (PDOException $e) {
    error_log("send_notifications.php: DB error: " . $e->getMessage());
    exit(1);
}

if (empty($users)) {
    error_log("send_notifications.php: No users to notify. Exiting.");
    exit(0);
}

// ── Send emails ──────────────────────────────────────────────────────────────
$successCount = 0;
$failCount    = 0;

foreach ($users as $user) {
    $name  = htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8');
    $email = $user['email'];

    $htmlBody = "
        <p>Hi {$name},</p>
        <p>This is your reminder to log your blood pressure reading in <strong>VITALS</strong>.</p>
        <p>Staying consistent helps you and your care team track your health.</p>
        <p><a href='https://cattle.cse.buffalo.edu/CSE442/2026-Fall/cse-442ab/'>Open VITALS</a></p>
        <p>Take care,<br>The VITALS Team</p>
    ";

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->SMTPDebug   = 2;
        $mail->Debugoutput = function ($str, $level) { error_log("[VITALS] SMTP: $str"); };
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = "ssl";
        $mail->Host = $config['host'];
        $mail->Port = 465;
        $mail->Username = $config['username'];
        $mail->Password = $config['password'];

        $mail->setFrom("442.warriors@gmail.com", "VITALS, 442 Warriors");
        $mail->addAddress($email, $user['name']);

        $mail->isHTML(true);
        $mail->Subject = 'VITALS Reminder - Time to log your blood pressure';
        $mail->Body    = $htmlBody;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));

        $mail->send();
        $successCount++;
    } catch (Exception $e) {
        error_log("send_notifications.php: Failed for {$email}: " . $mail->ErrorInfo);
        $failCount++;
    }
}

error_log("send_notifications.php: Done. Sent={$successCount}, Failed={$failCount}.");
flock($lock, LOCK_UN);
exit();