const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// Get all users
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    // Removendo o filtro de active para mostrar todos os usuários
    const users = await conn.query('SELECT id, name, email, role, active, can_login, sector_id FROM users');
    conn.release();
    
    // Converter BigInt para Number
    const processedUsers = users.map(user => ({
      ...user,
      id: Number(user.id),
      sector_id: user.sector_id ? Number(user.sector_id) : null
    }));
    
    console.log('Usuários enviados:', processedUsers);
    res.json(processedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
});

// Create new user
router.post('/', async (req, res) => {
  const { name, email, password, role, can_login, active, sector_id } = req.body;
  
  try {
    const conn = await db.getConnection();
    const cleanName = name ? String(name).trim() : '';
    const cleanEmail = email ? String(email).trim() : '';
    
    // Check if email already exists
    const [existingUser] = await conn.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', [cleanEmail]);
    
    if (existingUser) {
      conn.release();
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    
    // Default password: user's name (trim) when not provided
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      const defaultPassword = cleanName || 'senha123';
      hashedPassword = await bcrypt.hash(defaultPassword, 10);
    }
    
    // Insert user
    const result = await conn.query(
      'INSERT INTO users (name, email, password, role, active, can_login, sector_id, password_changed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [cleanName, cleanEmail, hashedPassword, role || 'view', active !== undefined ? !!active : true, can_login !== undefined ? !!can_login : false, sector_id || null, false]
    );
    
    conn.release();
    
    res.status(201).json({ 
      id: Number(result.insertId),
      message: 'Usuário criado com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
});

// Reset user password to default (user's name) and mark as not changed
router.post('/:id/reset-password', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [existingUser] = await conn.query('SELECT id, name FROM users WHERE id = ?', [req.params.id]);
    if (!existingUser) {
      conn.release();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    const defaultPassword = (existingUser.name ? String(existingUser.name).trim() : '') || 'senha123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await conn.query('UPDATE users SET password = ?, password_changed = false WHERE id = ?', [hashedPassword, req.params.id]);
    conn.release();
    res.json({ success: true, message: 'Senha resetada para o padrão (nome do usuário)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao resetar senha do usuário' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { name, email, role, active, can_login, sector_id } = req.body;
  
  try {
    const conn = await db.getConnection();
    const cleanName = name ? String(name).trim() : '';
    const cleanEmail = email ? String(email).trim() : '';
    
    // Check if user exists
    const [existingUser] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    
    if (!existingUser) {
      conn.release();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Update user
    await conn.query(
      'UPDATE users SET name = ?, email = ?, role = ?, active = ?, can_login = ?, sector_id = ? WHERE id = ?',
      [cleanName, cleanEmail, role, active, can_login, sector_id || null, req.params.id]
    );
    
    conn.release();
    
    res.json({ 
      id: parseInt(req.params.id),
      message: 'Usuário atualizado com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Check if user exists
    const [existingUser] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    
    if (!existingUser) {
      conn.release();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Delete user
    await conn.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    conn.release();
    
    res.json({ 
      success: true,
      message: 'Usuário excluído com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

module.exports = router;