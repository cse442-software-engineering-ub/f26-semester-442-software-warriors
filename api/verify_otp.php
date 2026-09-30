<?php
require_once 'config.php'; 

// Check for OTP and email set in session
// if not exit
if (!isset($_SESSION['reset_otp'] || !isset($_SESSION['reset_email']))) {
    header("Location: forgot_password.php")
    exit();
}

//Capture and clear status message from forgot_password.php
$status = null;
if (isset($_SESSION['status'])) {
    $status = $_SESSION['status'];
    unset($_SESSION['status']);
}

// Handle form submission 
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $entered_otp = $_POST['otp']; //grabs user inputted otp
    $stored_otp = $_SESSION['reset_otp']; //grabs generated otp
    $otp_time = $_SESSION['otp_time']; // grabs time when OTP was generated

    //Check OTP expiration (600 == 10 minutes)
    if (time() - $otp_time > 600) {
        $error = "OTP has expired. Please request a new one.";
        unset($_SESSION['reset_otp']);
        unset($_SESSION['otp_time']);
    }
    else if ($entered_otp == $stored_otp) { //otp verification
        $_SESSION['otp_verified'] = true;
        header("Location: reset_password.php");
        exit();
    } else {
        $error = "Invalid OTP. Please try again.";
    }

}