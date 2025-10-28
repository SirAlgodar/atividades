const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// Get all users
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    // Removendo o filtro de active para mostrar todos os usuários
    const users = await conn.query('SELECT id, name, email, role, active, sector_id FROM users');
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
  const { name, email, password, role } = req.body;
  
  try {
    const conn = await db.getConnection();
    
    // Check if email already exists
    const [existingUser] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUser) {
      conn.release();
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    
    // Use default password if not provided (for responsibles created from activity form)
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      hashedPassword = await bcrypt.hash('senha123', 10);
    }
    
    // Insert user
    const result = await conn.query(
      'INSERT INTO users (name, email, password, role, active, sector_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'user', true, req.body.sector_id || null]
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

// Update user
router.put('/:id', async (req, res) => {
  const { name, email, role, active } = req.body;
  
  try {
    const conn = await db.getConnection();
    
    // Check if user exists
    const [existingUser] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    
    if (!existingUser) {
      conn.release();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Update user
    await conn.query(
      'UPDATE users SET name = ?, email = ?, role = ?, active = ? WHERE id = ?',
      [name, email, role, active, req.params.id]
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