-- Create database if not exists
CREATE DATABASE IF NOT EXISTS compassbusinesscard;
USE compassbusinesscard;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  organization_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  INDEX idx_org_id (organization_id),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active)
);

-- Business cards table
CREATE TABLE IF NOT EXISTS business_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  organization_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  job_title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  image_url VARCHAR(500),
  cloud_storage_url VARCHAR(500),
  raw_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_org_id (organization_id),
  INDEX idx_name (name),
  INDEX idx_email (email),
  INDEX idx_phone (phone)
);

-- Create default admin organization and user
-- Password: admin123 (change this in production)
INSERT IGNORE INTO organizations (id, name) VALUES (1, 'Default Organization');
INSERT IGNORE INTO users (id, email, password, name, role, organization_id) 
VALUES (1, 'admin@example.com', '$2a$10$rOzJpRJZq4wGqVjKJ9J9xOuXHJHJHJHJHJHJHJHJHJHJHJHJHJHJHJH', 'Admin User', 'admin', 1);
