<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require_once __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

$userId = requireAuth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT email_notifications, message_frequency FROM notification_preferences WHERE user_id = ?");
        $stmt->execute([$userId]);
        $prefs = $stmt->fetch();

        if (!$prefs) {
            $prefs = [
                "email_notifications" => 1,
                "phone_notifications" => 1,
                "message_frequency" => "none"
            ];
        }

        echo json_encode($prefs);
    } catch (PDOException $e) {
        error_log(basename(__FILE__) . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error.']);
    }

} else if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $email_notifications = isset($_POST['email_notifications']) ? (int)$_POST['email_notifications'] : 1;
        $message_frequency   = isset($_POST['message_frequency']) ? $_POST['message_frequency'] : 'none';

        // Check if a row already exists for this user
        $stmt = $pdo->prepare("SELECT id FROM notification_preferences WHERE user_id = ?");
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();

        if ($existing) {
            $stmt = $pdo->prepare("UPDATE notification_preferences SET email_notifications = ?, message_frequency = ? WHERE user_id = ?");
            $stmt->execute([$email_notifications, $message_frequency, $userId]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO notification_preferences (user_id, email_notifications, message_frequency) VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $email_notifications, $message_frequency]);
        }

        http_response_code(200);
        echo json_encode(['message' => 'Notification preferences updated successfully.']);
    } catch (PDOException $e) {
        error_log(basename(__FILE__) . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error.']);
    }

} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET or POST.']);
    exit();
}
