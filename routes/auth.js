const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const conn = await db.getConnection();
    const rows = await conn.query('SELECT * FROM users WHERE email = ?', [username]);
    conn.release();
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );
    
    // Set session data
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordChanged: user.password_changed
    };
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordChanged: user.password_changed
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Change password route
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword, userId } = req.body;
  
  try {
    const conn = await db.getConnection();
    const rows = await conn.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const user = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      conn.release();
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await conn.query(
      'UPDATE users SET password = ?, password_changed = true WHERE id = ?',
      [hashedPassword, userId]
    );
    
    conn.release();
    
    // Update session
    if (req.session.user && req.session.user.id === userId) {
      req.session.user.passwordChanged = true;
    }
    
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout realizado com sucesso' });
});

// Check auth status
router.get('/status', (req, res) => {
  if (req.session.user) {
    res.json({ 
      isAuthenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

module.exports = router;