CREATE TABLE IF NOT EXISTS scheduled_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type ENUM('Income', 'Expense') NOT NULL,
    category VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    frequency ENUM('Daily', 'Weekly', 'Monthly', 'Yearly') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    last_execution DATE,
    next_execution DATE,
    status ENUM('Active', 'Paused', 'Completed') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
); 