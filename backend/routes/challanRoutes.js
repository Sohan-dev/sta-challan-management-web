/*
 * Challan API Handler
 * Backend endpoints for saving and retrieving challans
 *
 * This is a sample implementation using Node.js/Express
 * Adjust database connection based on your setup
 */

// Example using Express.js
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sta@2025',
  database: process.env.DB_NAME || 'sta',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

/**
 * POST /save-challan
 * Save challan data to database
 */
router.post('/save-challan', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      challanNo,
      transportForm,
      type,
      challanDate,
      senderName,
      senderEmail,
      senderContact,
      senderAddress,
      receiverName,
      receiverEmail,
      receiverContact,
      receiverAddress,
      items,
      vehicleNumber,
      pickedBy,
      deliveryNote
    } = req.body;

    // use a transaction to ensure header + all items are inserted together
    await connection.beginTransaction();

    // insert header row once
    const headerQuery = `
      INSERT INTO challans (
        challanNo, transportForm, type, challanDate,
        senderName, senderEmail, senderContact, senderAddress,
        receiverName, receiverEmail, receiverContact, receiverAddress,
        vehicleNumber, pickedBy, deliveryNote
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(headerQuery, [
      challanNo, transportForm, type, challanDate,
      senderName, senderEmail, senderContact, senderAddress,
      receiverName, receiverEmail, receiverContact, receiverAddress,
      vehicleNumber, pickedBy, deliveryNote
    ]);

    // insert items into separate table
    const itemQuery = `
      INSERT INTO challan_items (challanNo, description, quantity, remarks)
      VALUES (?, ?, ?, ?)
    `;

    for (const item of items) {
      await connection.execute(itemQuery, [
        challanNo,
        item.description,
        item.quantity,
        item.remarks
      ]);
    }

    await connection.commit();

    res.json({ success: true, message: 'Challan saved successfully', challanNo });
  } catch (error) {
    console.error('Error saving challan:', error);
    try { await connection.rollback(); } catch (e) { console.error('rollback failed', e); }
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /search-challan/:challanNo
 * Search for a specific challan
 */
router.get('/search-challan/:challanNo', async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    const { challanNo } = req.params;
    
    console.log(`Searching for challan: ${challanNo}`);
    
    // join header with item rows
    const query = `
      SELECT c.*, i.description, i.quantity, i.remarks
      FROM challans c
      LEFT JOIN challan_items i ON c.challanNo = i.challanNo
      WHERE c.challanNo = ?
      ORDER BY i.id ASC
    `;
    
    const [rows] = await connection.execute(query, [challanNo]);
    
    console.log(`Found ${rows.length} results for challan: ${challanNo}`);
    
    if (rows.length === 0) {
      return res.json({ success: false, message: 'Challan not found' });
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error searching challan:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * GET /challan-stats
 * Get challan statistics
 */
router.get('/challan-stats', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const year = new Date().getFullYear();
    
    const query = `
      SELECT 
        type,
        COUNT(*) as count,
        MAX(createdAt) as lastCreated
      FROM challans 
      WHERE YEAR(createdAt) = ?
      GROUP BY type
    `;
    
    const [rows] = await connection.execute(query, [year]);
    
    res.json({ success: true, stats: rows });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /all-challans
 * Get all challans with pagination
 */
router.get('/all-challans', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM challans
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await connection.execute(query, [limit, offset]);
    
    // Get total count
    const [countResult] = await connection.execute('SELECT COUNT(DISTINCT challanNo) as total FROM challans');
    const total = countResult[0].total;

    res.json({ 
      success: true, 
      data: rows,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching challans:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

/**
 * PUT /update-challan/:challanNo
 * Update an existing challan with the same challan number
 */
router.put('/update-challan/:challanNo', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { challanNo } = req.params;
    const {
      transportForm,
      type,
      challanDate,
      senderName,
      senderEmail,
      senderContact,
      senderAddress,
      receiverName,
      receiverEmail,
      receiverContact,
      receiverAddress,
      items,
      vehicleNumber,
      pickedBy,
      deliveryNote
    } = req.body;

    await connection.beginTransaction();

    // update header row
    const updateHeader = `
      UPDATE challans SET
        transportForm = ?,
        type = ?,
        challanDate = ?,
        senderName = ?,
        senderEmail = ?,
        senderContact = ?,
        senderAddress = ?,
        receiverName = ?,
        receiverEmail = ?,
        receiverContact = ?,
        receiverAddress = ?,
        vehicleNumber = ?,
        pickedBy = ?,
        deliveryNote = ?
      WHERE challanNo = ?
    `;

    await connection.execute(updateHeader, [
      transportForm,
      type,
      challanDate,
      senderName,
      senderEmail,
      senderContact,
      senderAddress,
      receiverName,
      receiverEmail,
      receiverContact,
      receiverAddress,
      vehicleNumber,
      pickedBy,
      deliveryNote,
      challanNo
    ]);

    // clear old items then insert new ones
    await connection.execute('DELETE FROM challan_items WHERE challanNo = ?', [challanNo]);
    const itemQuery = `
      INSERT INTO challan_items (challanNo, description, quantity, remarks)
      VALUES (?, ?, ?, ?)
    `;
    for (const item of items) {
      await connection.execute(itemQuery, [challanNo, item.description, item.quantity, item.remarks]);
    }

    await connection.commit();

    res.json({ success: true, message: 'Challan updated successfully', challanNo });
  } catch (error) {
    console.error('Error updating challan:', error);
    try { await connection.rollback(); } catch (e) { console.error('rollback failed', e); }
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
