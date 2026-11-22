-- Run once in phpMyAdmin (SQL tab) on each server's database.
-- Used by api/rate_limit.php to limit wrong passwords and how many emails one person can trigger.
CREATE TABLE IF NOT EXISTS rate_limits (
  id INT NOT NULL AUTO_INCREMENT,
  action VARCHAR(30) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY action_key_time (action, key_hash, created_at)
);
