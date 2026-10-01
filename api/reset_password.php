<?php
require_once 'config.php';

// Check if OTP is verified
if (!isset($_SESSION['otp_verified']) || !isset($_SESSION['reset_email'])) {
    header("Location: forgot_password.php");
    exit();
}

//Handle password form submission
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];

    if ($password !== $confirm_password) {
        $error = "Passwords do not match";
    } else {
        $email = $_SESSION['reset_email'];
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        //update password in database
        $stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->bind_param("ss", $hashed_password, $email);

        if ($stmt->execute()) {
            //clear all session variables
            session_unset();
            session_destroy();

            header("Location: login.php?reset=success");
            exit();
        } else {
            $error = "Error updating password. Please try again.";
        }
    }
}
?>