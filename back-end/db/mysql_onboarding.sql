CREATE TABLE IF NOT EXISTS user_onboarding (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  income_monthly BIGINT NOT NULL,
  ai_name VARCHAR(100) NOT NULL,
  ai_tone VARCHAR(30) NOT NULL,
  needs_pct INT NOT NULL,
  wants_pct INT NOT NULL,
  savings_pct INT NOT NULL,
  auth_method VARCHAR(30) NOT NULL,
  mfa_enabled TINYINT(1) NOT NULL,
  pin_hash VARCHAR(255),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_onboarding_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  goal_code VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_user_goal (user_id, goal_code),
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);
