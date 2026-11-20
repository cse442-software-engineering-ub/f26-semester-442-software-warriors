# VITALS – Cron Job Setup for Email Notifications

Add the following entries to the server's crontab (`crontab -e`) to schedule the
notification emails. Replace `/path/to/api/` with the actual absolute path to the
`api/` directory on the server.

```cron
# Run at noon daily (daily reminders — message_frequency = 'daily')
0 12 * * * php /path/to/api/send_notifications.php -- --time=noon

# Run at 9am daily (twice-daily morning — message_frequency = 'twice_daily')
0 9 * * * php /path/to/api/send_notifications.php -- --time=morning

# Run at 3pm daily (twice-daily afternoon — message_frequency = 'twice_daily')
0 15 * * * php /path/to/api/send_notifications.php -- --time=afternoon

*/30 * * * * /usr/bin/php /api/send_notifications.php >> /var/log/vitals_cron.log 2>&1 
# THIS IS THE CRONTAB WE WILL USE (ignore the other stuff in here)
```

## Notes

- The `--` before `--time=` is required on some systems so the shell does not
  interpret `--time` as a flag for `php` itself.
- Make sure the PHP binary is in the cron user's `PATH`, or use the full path
  (e.g. `/usr/bin/php`).
- Output and errors are logged via `error_log()` to the server's PHP error log.
  To also capture stdout/stderr to a file, append redirection:
  ```
  0 12 * * * php /path/to/api/send_notifications.php -- --time=noon >> /var/log/vitals_cron.log 2>&1
  ```
- Ensure `mail_config.php` contains the correct SMTP credentials before deploying.
