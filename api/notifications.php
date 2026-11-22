<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require_once __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

$userId = requireAuth();

// Valid frequency options and their cron expressions
// These values are stored in the DB and can be parsed by the crontab script
$FREQUENCY_OPTIONS = [
    'once_daily_noon'  => '0 12 * * *',   // once a day at noon
    'twice_daily'      => '0 8,20 * * *',  // twice a day (8am and 8pm)
    'every_hour'       => '0 * * * *',     // every hour
    'every_30_minutes' => '*/30 * * * *',  // every 30 minutes
    'none'             => '',              // disabled
];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT email_notifications, message_frequency FROM notification_preferences WHERE uid = ?");
        $stmt->execute([$userId]);
        $prefs = $stmt->fetch();

        if (!$prefs) {
            $prefs = [
                "email_notifications" => 1,
                "message_frequency"   => "none"
            ];
        }

        // Include the available frequency options and their cron expressions in the response
        $prefs['frequency_options'] = $FREQUENCY_OPTIONS;

        echo json_encode($prefs);
    } catch (PDOException $e) {
        error_log(basename(__FILE__) . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error.']);
    }

} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $email_notifications = isset($_POST['email_notifications']) ? (int)$_POST['email_notifications'] : 1;
        $message_frequency   = isset($_POST['message_frequency']) ? $_POST['message_frequency'] : 'none';
        // Validate that the submitted frequency is one of the allowed options
        if (!array_key_exists($message_frequency, $FREQUENCY_OPTIONS)) {
            http_response_code(400);
            echo json_encode([
                'error'   => 'Invalid message_frequency value.',
                'allowed' => array_keys($FREQUENCY_OPTIONS)
            ]);
            exit();
        }

        if ($email_notifications > 1 || $email_notifications < 0 || !is_int($email_notifications)) {
            http_response_code(400);
            echo json_encode([
                'error'   => 'Notifications must be 0 or 1',
            ]);
            exit();
        }

        // Check if a row already exists for this user
        $stmt = $pdo->prepare("SELECT uid FROM notification_preferences WHERE uid = ?");
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();


        if ($existing) {
            $stmt = $pdo->prepare("UPDATE notification_preferences SET email_notifications = ?, message_frequency = ? WHERE uid = ?");
            $stmt->execute([$email_notifications, $message_frequency, $userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO notification_preferences (uid, email_notifications, message_frequency) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $email_notifications, $message_frequency]);
        }

        http_response_code(200);
        echo json_encode([
            'message'    => 'Notification preferences updated successfully.',
            'cron_expr'  => $FREQUENCY_OPTIONS[$message_frequency]
        ]);
    } catch (PDOException $e) {
        error_log(basename(__FILE__) . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error. ']);
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET or POST.']);
    exit();
}
