<?php
/**
 * send_notifications.php
 * Runs every 30 minutes via cron. Sends:
 *   1. Blood pressure reminders to users whose notification_preferences.message_frequency is due now.
 *   2. A one-time reminder for appointments starting within the next 48 hours.
 * Both only go to users with email_notifications on.
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

$siteUrl = 'https://cattle.cse.buffalo.edu/CSE442/2026-Fall/cse-442ab/';

// Every email to send this run goes in here. 'aid' is set only for appointment reminders.
$outbox = [];

// ── 1. Blood pressure reminders: which frequencies are due right now ─────────
// The script runs every 15 minutes (for appointment reminders), so the blood
// pressure frequencies are tied to the :00 and :30 runs only.
$hour   = (int)date('G');
$minute = (int)date('i');
$slot   = (int)(floor($minute / 15) * 15);   // 0, 15, 30, or 45

$dueFrequencies = [];

if ($slot === 0 || $slot === 30) {
    $dueFrequencies[] = 'every_30_minutes';
}
if ($slot === 0) {
    $dueFrequencies[] = 'every_hour';
    if ($hour === 12)
        $dueFrequencies[] = 'once_daily_noon';
    if ($hour === 8 || $hour === 20)
        $dueFrequencies[] = 'twice_daily';
}

error_log(sprintf(
    "send_notifications.php: %s -> due: %s",
    date('Y-m-d H:i'), $dueFrequencies ? implode(', ', $dueFrequencies) : '(no reminders this slot)'
));

$users = [];
if (!empty($dueFrequencies)) {
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
        error_log("send_notifications.php: DB error (reminders): " . $e->getMessage());
        $users = [];
    }
}

foreach ($users as $user) {
    $name = htmlspecialchars($user['name'], ENT_QUOTES, 'UTF-8');

    $outbox[] = [
        'email'   => $user['email'],
        'name'    => $user['name'],
        'subject' => 'VITALS Reminder - Time to log your blood pressure',
        'body'    => "
            <p>Hi {$name},</p>
            <p>This is your reminder to log your blood pressure reading in <strong>VITALS</strong>.</p>
            <p>Staying consistent helps you and your care team track your health.</p>
            <p><a href='{$siteUrl}'>Open VITALS</a></p>
            <p>Take care,<br>The VITALS Team</p>
        ",
        'aid'     => null,
    ];
}

// ── 2. Appointment reminders: starting within the next 48 hours ──────────────
// Times are computed in PHP so they use the same timezone as the stored dates.
$now   = date('Y-m-d H:i:s');
$until = date('Y-m-d H:i:s', strtotime('+48 hours'));

try {
    $stmt = $pdo->prepare("
        SELECT a.aid, a.doctors_name, a.appointment_date, a.location, a.address,
               u.name, u.email
        FROM appointments a
        JOIN users u ON u.id = a.uid
        LEFT JOIN notification_preferences np ON np.uid = a.uid
        WHERE a.appointment_date > ?
          AND a.appointment_date <= ?
          AND a.reminder_48h_sent = 0
          AND COALESCE(np.email_notifications, 1) = 1
    ");
    $stmt->execute([$now, $until]);
    $appointments = $stmt->fetchAll();
} catch (PDOException $e) {
    error_log("send_notifications.php: DB error (appointments): " . $e->getMessage());
    $appointments = [];
}

foreach ($appointments as $appt) {
    $name   = htmlspecialchars($appt['name'], ENT_QUOTES, 'UTF-8');
    $doctor = htmlspecialchars($appt['doctors_name'], ENT_QUOTES, 'UTF-8');
    $when   = date('l, F j \a\t g:i A', strtotime($appt['appointment_date']));

    $where = '';
    if (!empty($appt['location'])) {
        $where .= '<br>' . htmlspecialchars($appt['location'], ENT_QUOTES, 'UTF-8');
    }
    if (!empty($appt['address'])) {
        $where .= '<br>' . htmlspecialchars($appt['address'], ENT_QUOTES, 'UTF-8');
    }

    $outbox[] = [
        'email'   => $appt['email'],
        'name'    => $appt['name'],
        'subject' => 'VITALS Reminder - Upcoming appointment with ' . $appt['doctors_name'],
        'body'    => "
            <p>Hi {$name},</p>
            <p>This is a reminder that you have an upcoming appointment in the next 48 hours:</p>
            <p><strong>{$doctor}</strong><br>{$when}{$where}</p>
            <p><a href='{$siteUrl}'>Open VITALS</a> to view or change your appointments.</p>
            <p>Take care,<br>The VITALS Team</p>
        ",
        'aid'     => (int)$appt['aid'],
    ];
}

if (empty($outbox)) {
    error_log("send_notifications.php: Nothing to send. Exiting.");
    exit(0);
}

// ── Send everything over one SMTP connection ─────────────────────────────────
$mail = new PHPMailer(true);
$mail->isSMTP();
$mail->SMTPDebug     = 0;      // set back to 2 only while debugging
$mail->SMTPKeepAlive = true;   // reuse one connection for the whole batch
$mail->SMTPAuth      = true;
$mail->SMTPSecure    = "ssl";
$mail->Host          = $config['host'];
$mail->Port          = 465;
$mail->Username      = $config['username'];
$mail->Password      = $config['password'];
$mail->setFrom("442.warriors@gmail.com", "VITALS, 442 Warriors");
$mail->isHTML(true);

$markSent = $pdo->prepare("UPDATE appointments SET reminder_48h_sent = 1 WHERE aid = ?");

$successCount = 0;
$failCount    = 0;

foreach ($outbox as $item) {
    try {
        $mail->clearAddresses();
        $mail->addAddress($item['email'], $item['name']);
        $mail->Subject = $item['subject'];
        $mail->Body    = $item['body'];
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $item['body']));
        $mail->send();
        $successCount++;

        // Only mark an appointment as reminded after its email actually went out
        if ($item['aid'] !== null) {
            $markSent->execute([$item['aid']]);
        }
    } catch (Exception $e) {
        error_log("send_notifications.php: Failed for {$item['email']}: " . $mail->ErrorInfo);
        $failCount++;
        $mail->smtpClose();   // reset the connection so the next email starts clean
    }
}

$mail->smtpClose();
error_log("send_notifications.php: Done. Sent={$successCount}, Failed={$failCount}.");
flock($lock, LOCK_UN);
exit();