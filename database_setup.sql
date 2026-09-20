-- Challan Management System Database Setup

CREATE TABLE IF NOT EXISTS challans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challanNo VARCHAR(255) UNIQUE NOT NULL,
    transportForm VARCHAR(255),
    type VARCHAR(255),
    challanDate VARCHAR(255),
    senderName VARCHAR(255),
    senderEmail VARCHAR(255),
    senderContact VARCHAR(255),
    senderAddress TEXT,
    receiverName VARCHAR(255),
    receiverEmail VARCHAR(255),
    receiverContact VARCHAR(255),
    receiverAddress TEXT,
    -- item-specific columns removed (moved to challan_items)
    deliveryNote TEXT,
    vehicleNumber VARCHAR(255),
    pickedBy VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_challanNo (challanNo),
    INDEX idx_transportForm (transportForm),
    INDEX idx_type (type),
    INDEX idx_challanDate (challanDate)
);

-- Create index for searching by challan number
CREATE INDEX idx_challan_search ON challans(challanNo, transportForm, type);

-- New table to store item rows associated with a challan
CREATE TABLE IF NOT EXISTS challan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challanNo VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    quantity VARCHAR(255),
    remarks VARCHAR(255),
    FOREIGN KEY (challanNo) REFERENCES challans(challanNo) ON DELETE CASCADE,
    INDEX idx_item_challan (challanNo)
);

-- Optional: Create a summary table for challan statistics
CREATE TABLE IF NOT EXISTS challan_counters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    counter INT DEFAULT 0,
    UNIQUE KEY unique_year_type (year, type)
);
