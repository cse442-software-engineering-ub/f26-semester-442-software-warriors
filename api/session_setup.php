<?php
// One cookie setup for every API file, so all pages read the SAME cookie.
// The name is ours (not PHPSESSID), so old cookies and other apps on aptitude are ignored.
// The path is our app folder: /CSE442/2026-Fall/cse-442ab/ on aptitude, / on a local copy.
if (session_status() === PHP_SESSION_NONE) {
    session_name('VITALSSESSID');
    $appPath = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\') . '/';
    session_set_cookie_params([
        'path'     => $appPath,
        'secure'   => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
