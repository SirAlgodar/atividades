const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get activities report with filters
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Build query with filters
    let query = `
      SELECT a.*, u.name as responsible_name 
      FROM activities a
      LEFT JOIN users u ON a.responsible_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Apply filters if provided
    if (req.query.origin) {
      query += ' AND a.origin LIKE ?';
      params.push(`%${req.query.origin}%`);
    }
    
    if (req.query.activity) {
      query += ' AND a.activity LIKE ?';
      params.push(`%${req.query.activity}%`);
    }
    
    if (req.query.start_date) {
      query += ' AND a.date >= ?';
      params.push(req.query.start_date);
    }
    
    if (req.query.end_date) {
      query += ' AND a.date <= ?';
      params.push(req.query.end_date);
    }
    
    if (req.query.status) {
      query += ' AND a.status = ?';
      params.push(req.query.status);
    }
    
    if (req.query.priority) {
      query += ' AND a.priority = ?';
      params.push(req.query.priority);
    }
    
    if (req.query.responsible_id) {
      query += ' AND a.responsible_id = ?';
      params.push(req.query.responsible_id);
    }
    
    // Order by date desc
    query += ' ORDER BY a.date DESC';
    
    const activities = await conn.query(query, params);
    conn.release();
    
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao gerar relatório' });
  }
});

// Export report to Excel (mock implementation)
router.get('/export', async (req, res) => {
  try {
    // In a real implementation, this would generate an Excel file
    // For this example, we'll just return a success message
    
    res.json({ 
      success: true,
      message: 'Relatório exportado com sucesso',
      downloadUrl: '/reports/download/report.xlsx' // Mock URL
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao exportar relatório' });
  }
});

module.exports = router;