-- Create the Database
CREATE DATABASE IF NOT EXISTS online_voting_system;
USE online_voting_system;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    voter_id VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role ENUM('voter', 'admin') DEFAULT 'voter',
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Elections Table
CREATE TABLE IF NOT EXISTS elections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('pending', 'active', 'closed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    description TEXT,
    candidate_photo VARCHAR(255) NULL,
    party_symbol VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

-- 4. Votes Table
CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    election_id INT NOT NULL,
    candidate_id INT NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_election (user_id, election_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- 5. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    status ENUM('unread', 'read') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Seed Data
-- Default Admin: admin@ovs.com (password: Admin@123)
-- Default Voter: voter@ovs.com (password: Voter@123)
-- Alt Voter: john@example.com (password: adminpassword123)
INSERT INTO users (name, email, voter_id, phone, password, role, address)
VALUES 
('Admin User', 'admin@ovs.com', 'ADMIN123', '9999999999', '$2a$10$6DE1LJfDHPsvlsjzWZR5Uez0bLpQw27MhQheGU.1ejRWfqESP6VO.', 'admin', 'Election Office Headquarters'),
('Voter User', 'voter@ovs.com', 'VOT-1000', '8888888888', '$2a$10$Y1LJc.3U3nq8mjhmJD5B5OyY5yIG6VKk1NXkII46dnh8Zg8E0813m', 'voter', 'Voter District Office'),
('John Doe', 'john@example.com', 'VOT-1001', '9876543210', '$2a$10$SdB/3XSB4pEJFnqw6KWBJu/6FjYJAWVXelsmLoVoA7.uAPAmC.pZG', 'voter', '123 Main Street, City')
ON DUPLICATE KEY UPDATE id=id;

-- Insert Sample Elections
INSERT INTO elections (id, election_name, description, start_date, end_date, status)
VALUES 
(1, 'Student Council Election 2026', 'Election for the Student Council representatives.', '2026-08-12 09:00:00', '2026-08-25 18:00:00', 'active'),
(2, 'Class Representative Election 2026', 'Election for class representatives.', '2026-08-15 09:00:00', '2026-08-30 18:00:00', 'active')
ON DUPLICATE KEY UPDATE id=id;

-- Insert Sample Candidates for Student Council Election 2026 (election_id = 1)
INSERT INTO candidates (id, election_id, candidate_name, party_name, description)
VALUES 
(1, 1, 'Candidate A', 'Unity Party', 'Dedicated to student welfare and academic excellence.'),
(2, 1, 'Candidate B', 'Progress Alliance', 'Focused on innovation and modern campus facilities.'),
(3, 1, 'Candidate C', 'Green Future Front', 'Committed to sustainability and environmental initiatives.')
ON DUPLICATE KEY UPDATE id=id;
