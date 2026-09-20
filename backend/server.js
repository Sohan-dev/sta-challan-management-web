/**
 * Backend Server for STA React Challan Management
 * Setup: npm install express mysql2 cors dotenv
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const challanRoutes = require('./routes/challanRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection test
const testDatabaseConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Sta@2025',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('✓ Database connection successful');
    
    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'test'}\``);
    console.log(`✓ Database '${process.env.DB_NAME || 'test'}' ready`);
    
    // Switch to the database
    await connection.changeUser({ database: process.env.DB_NAME || 'test' });
    
    // Create tables if they don't exist
    await connection.execute(`
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
        -- item columns moved to challan_items
        deliveryNote TEXT,
        vehicleNumber VARCHAR(255),
        pickedBy VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_challanNo (challanNo),
        INDEX idx_transportForm (transportForm),
        INDEX idx_type (type),
        INDEX idx_challanDate (challanDate)
      )
    `);
    console.log('✓ Table "challans" ready');

    // ensure item table exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS challan_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challanNo VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        quantity VARCHAR(255),
        remarks VARCHAR(255),
        FOREIGN KEY (challanNo) REFERENCES challans(challanNo) ON DELETE CASCADE,
        INDEX idx_item_challan (challanNo)
      )
    `);
    console.log('✓ Table "challan_items" ready');
    
    await connection.end();
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.error('Please check your .env file credentials');
    process.exit(1);
  }
};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Hardcoded credentials (replace with database lookup later)
  const validCredentials = [
    { username: 'admin', password: 'admin@123' },
    { username: 'baban', password: 'baban123' },
    { username: 'pubali', password: 'pubali@123' }
  ];
  
  const user = validCredentials.find(
    u => u.username === username && u.password === password
  );
  
  if (user) {
    res.json({ success: true, message: 'Login successful', username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// Routes
app.use('/', challanRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server with database check
testDatabaseConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`\n═══════════════════════════════════════`);
    console.log(`✓ Challan Management Server running`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`═══════════════════════════════════════`);
    console.log(`\nAvailable API endpoints:`);
    console.log(`  POST   /save-challan`);
    console.log(`  GET    /search-challan/:challanNo`);
    console.log(`  PUT    /update-challan/:challanNo`);
    console.log(`  GET    /challan-stats`);
    console.log(`  GET    /all-challans`);
    console.log(`  GET    /health\n`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
