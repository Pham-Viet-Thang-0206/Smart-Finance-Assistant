CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(200) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS user_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('expense','income') NOT NULL DEFAULT 'expense',
  amount BIGINT NOT NULL DEFAULT 0,
  description VARCHAR(255),
  category VARCHAR(50),
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  ai_category VARCHAR(50),
  ai_confidence DECIMAL(5,2),
  raw_text TEXT,
  attachment_url TEXT,
  occurred_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_user_date (user_id, occurred_at),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);
