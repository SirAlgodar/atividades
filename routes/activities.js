const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Helper to convert BigInt values to Number recursively for JSON responses
function toPlain(value) {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(v => toPlain(v));
  if (t === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = toPlain(value[k]);
    }
    return out;
  }
  return value;
}

function durationToMinutes(str) {
  if (!str) return 0;
  const [h, m] = String(str).split(':').map(Number);
  if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  return 0;
}

function minutesToDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Get all activities with optional filters
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
    
    // Restrição por papel: não-admin vê somente próprias/atribuídas
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    if (sessionUser && sessionUser.role !== 'admin') {
      query += ' AND (a.created_by = ? OR a.responsible_id = ?)';
      params.push(sessionUser.id, sessionUser.id);
    }

    // Order by date desc
    query += ' ORDER BY a.date DESC';
    
    const activities = await conn.query(query, params);
    conn.release();
    
    res.json(toPlain(activities));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar atividades' });
  }
});

// Get activity by ID
router.get('/:id', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [activity] = await conn.query(
      `SELECT a.*, u.name as responsible_name 
       FROM activities a
       LEFT JOIN users u ON a.responsible_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    conn.release();
    
    if (!activity) {
      return res.status(404).json({ message: 'Atividade não encontrada' });
    }
    
    res.json(toPlain(activity));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar atividade' });
  }
});

// Create new activity
router.post('/', async (req, res) => {
  const { 
    origin, 
    activity, 
    date, 
    duration, 
    status, 
    priority, 
    responsible_id, 
    observation 
  } = req.body;
  
  try {
    // Permissão: qualquer usuário autenticado pode criar; viewers só criam para si
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    if (!sessionUser) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const conn = await db.getConnection();
    
    // Insert activity
    // Enforce responsible_id for viewers
    const finalResponsibleId = (sessionUser.role === 'view') ? sessionUser.id : responsible_id;

    const result = await conn.query(
      `INSERT INTO activities 
       (origin, activity, date, duration, status, priority, responsible_id, created_by, observation) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [origin, activity, date, duration, status, priority, finalResponsibleId, sessionUser.id, observation]
    );
    
    // Check webhook configuration for auto-send
    const [webhookConfig] = await conn.query('SELECT * FROM webhook_config WHERE active = true AND auto_send = true');
    
    if (webhookConfig) {
      // Auto-send to webhook would be implemented here
      console.log('Auto-sending to webhook:', webhookConfig.url);
    }
    
    conn.release();
    
    res.status(201).json({ 
      id: Number(result.insertId),
      message: 'Atividade criada com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar atividade' });
  }
});

// Update activity
router.put('/:id', async (req, res) => {
  const { 
    origin, 
    activity, 
    date, 
    duration, 
    status, 
    priority, 
    responsible_id, 
    observation,
    duration_delta 
  } = req.body;
  
  try {
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    if (!sessionUser) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const conn = await db.getConnection();
    
    // Check if activity exists
    const [existingActivity] = await conn.query('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    
    if (!existingActivity) {
      conn.release();
      return res.status(404).json({ message: 'Atividade não encontrada' });
    }
    
    // Autorização por papel
    if (sessionUser.role === 'view') {
      conn.release();
      return res.status(403).json({ message: 'Permissão negada' });
    }
    if (sessionUser.role !== 'admin') {
      const isOwnerOrResponsible = (existingActivity.created_by === sessionUser.id) || (existingActivity.responsible_id === sessionUser.id);
      if (!isOwnerOrResponsible) {
        conn.release();
        return res.status(403).json({ message: 'Permissão negada' });
      }
    }

    // Prepare values, allowing partial updates and duration sum
    const newOrigin = origin !== undefined ? origin : existingActivity.origin;
    const newActivity = activity !== undefined ? activity : existingActivity.activity;
    const newDate = date !== undefined ? date : existingActivity.date;

    let newDuration = existingActivity.duration;
    if (duration_delta !== undefined) {
      const base = durationToMinutes(existingActivity.duration);
      const delta = Number(duration_delta) || 0;
      newDuration = minutesToDuration(Math.max(0, base + delta));
    } else if (duration !== undefined) {
      newDuration = duration;
    }

    const newStatus = status !== undefined ? status : existingActivity.status;
    const newPriority = priority !== undefined ? priority : existingActivity.priority;
    const newResponsibleId = responsible_id !== undefined ? responsible_id : existingActivity.responsible_id;
    const newObservation = observation !== undefined ? observation : existingActivity.observation;

    // Update activity
    await conn.query(
      `UPDATE activities 
       SET origin = ?, activity = ?, date = ?, duration = ?, 
           status = ?, priority = ?, responsible_id = ?, observation = ? 
       WHERE id = ?`,
      [newOrigin, newActivity, newDate, newDuration, newStatus, newPriority, newResponsibleId, newObservation, req.params.id]
    );
    
    // Check webhook configuration for auto-send
    const [webhookConfig] = await conn.query('SELECT * FROM webhook_config WHERE active = true AND auto_send = true');
    
    if (webhookConfig) {
      // Auto-send to webhook would be implemented here
      console.log('Auto-sending to webhook:', webhookConfig.url);
    }
    
    conn.release();
    
    // Return updated row including timestamps
    const [updated] = await conn.query(
      `SELECT a.*, u.name as responsible_name 
       FROM activities a
       LEFT JOIN users u ON a.responsible_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    res.json(toPlain(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar atividade' });
  }
});

// Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    if (!sessionUser) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    if (sessionUser.role !== 'admin') {
      return res.status(403).json({ message: 'Somente administradores podem excluir atividades' });
    }

    const conn = await db.getConnection();
    
    // Check if activity exists
    const [existingActivity] = await conn.query('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    
    if (!existingActivity) {
      conn.release();
      return res.status(404).json({ message: 'Atividade não encontrada' });
    }
    
    // Delete activity
    await conn.query('DELETE FROM activities WHERE id = ?', [req.params.id]);
    conn.release();
    
    res.json({ 
      success: true,
      message: 'Atividade excluída com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao excluir atividade' });
  }
});

// Get activities summary for dashboard
router.get('/summary/dashboard', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    const whereClause = (sessionUser && sessionUser.role !== 'admin') ? 'WHERE created_by = ? OR responsible_id = ?' : '';
    const whereParams = (sessionUser && sessionUser.role !== 'admin') ? [sessionUser.id, sessionUser.id] : [];
    
    // Get total activities count
    const [totalResult] = await conn.query(`SELECT COUNT(*) as total FROM activities ${whereClause}`, whereParams);
    const totalActivities = Number(totalResult.total || 0);
    
    // Get completed activities count
    const [completedResult] = await conn.query(
      whereClause
        ? `SELECT COUNT(*) as total FROM activities ${whereClause} AND status = 'concluida'`
        : `SELECT COUNT(*) as total FROM activities WHERE status = 'concluida'`,
      whereParams
    );
    const completedActivities = Number(completedResult.total || 0);
    
    // Calculate total hours
    const durationResults = await conn.query(`SELECT duration FROM activities ${whereClause}`, whereParams);
    let totalMinutes = 0;
    
    durationResults.forEach(item => {
      const [hours, minutes] = item.duration.split(':').map(Number);
      totalMinutes += (hours * 60) + minutes;
    });
    
    const totalHours = (totalMinutes / 60).toFixed(1);
    
    // Get hours by month
    const hoursByMonthRaw = await conn.query(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(
          SUBSTRING_INDEX(duration, ':', 1) * 60 + 
          SUBSTRING_INDEX(duration, ':', -1)
        ) / 60 as hours
      FROM activities
      ${whereClause ? whereClause : ''}
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month
    `, whereParams);
    const hoursByMonth = hoursByMonthRaw.map(r => ({
      month: r.month,
      hours: Number(r.hours)
    }));
    
    // Get activities by origin
    const activitiesByOriginRaw = await conn.query(`
      SELECT origin, COUNT(*) as count
      FROM activities
      ${whereClause ? whereClause : ''}
      GROUP BY origin
      ORDER BY count DESC
    `, whereParams);
    const activitiesByOrigin = activitiesByOriginRaw.map(r => ({
      origin: r.origin,
      count: Number(r.count)
    }));
    
    conn.release();
    
    res.json({
      totalActivities,
      completedActivities,
      totalHours,
      hoursByMonth,
      activitiesByOrigin
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar resumo de atividades' });
  }
});

module.exports = router;