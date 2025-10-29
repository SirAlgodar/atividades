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
    let cleanEmail = email ? String(email).trim() : '';
    const loginAllowed = can_login !== undefined ? !!can_login : false;

    // Helper to generate placeholder email for non-login responsibles
    const genPlaceholderEmail = () => {
      const base = (cleanName || 'responsavel').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
      const suffix = Date.now();
      return `${base || 'responsavel'}.${suffix}@local`;
    };

    // If user can login, email is mandatory
    if (loginAllowed && !cleanEmail) {
      conn.release();
      return res.status(400).json({ message: 'Email é obrigatório para usuários com acesso' });
    }

    // For non-login responsibles, allow missing email and generate placeholder
    if (!loginAllowed && !cleanEmail) {
      cleanEmail = genPlaceholderEmail();
    }

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
      [cleanName, cleanEmail, hashedPassword, role || 'view', active !== undefined ? !!active : true, loginAllowed, sector_id || null, false]
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
    let cleanEmail = email !== undefined ? String(email).trim() : undefined; // may be omitted
    const loginAllowed = can_login !== undefined ? !!can_login : undefined;

    // Check if user exists
    const [existingUser] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);

    if (!existingUser) {
      conn.release();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Determine final can_login and email values
    const finalCanLogin = (loginAllowed === undefined) ? !!existingUser.can_login : loginAllowed;
    if (cleanEmail === undefined) cleanEmail = existingUser.email; // not provided -> keep

    // If enabling login, require a non-empty email
    if (finalCanLogin && !cleanEmail) {
      conn.release();
      return res.status(400).json({ message: 'Email é obrigatório para usuários com acesso' });
    }

    // If email changed and provided, check uniqueness
    if (cleanEmail && cleanEmail !== existingUser.email) {
      const [dupe] = await conn.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND id <> ?', [cleanEmail, req.params.id]);
      if (dupe) {
        conn.release();
        return res.status(400).json({ message: 'Email já cadastrado' });
      }
    }

    await conn.query(
      'UPDATE users SET name = ?, email = ?, role = ?, active = ?, can_login = ?, sector_id = ? WHERE id = ?',
      [cleanName || existingUser.name, cleanEmail || existingUser.email, role || existingUser.role, (active !== undefined ? !!active : !!existingUser.active), finalCanLogin, sector_id || existingUser.sector_id || null, req.params.id]
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
    const id = req.params.id;

    // Check if user exists
    const [existingUser] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);

    if (!existingUser) {
      conn.release();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // If coming from Responsáveis UI, block deletion of users with access
    const from = (req.query.from || '').toString();
    if (from === 'responsavel' && existingUser.can_login) {
      conn.release();
      return res.status(403).json({ message: 'Não é permitido excluir usuários com acesso pela aba Responsáveis' });
    }

    // Block deletion if there are related activities
    const [respCountRow] = await conn.query('SELECT COUNT(*) AS cnt FROM activities WHERE responsible_id = ?', [id]);
    const [creatorCountRow] = await conn.query('SELECT COUNT(*) AS cnt FROM activities WHERE created_by = ?', [id]);
    const respCnt = Number(respCountRow && respCountRow.cnt || 0);
    const creatorCnt = Number(creatorCountRow && creatorCountRow.cnt || 0);
    if (respCnt > 0 || creatorCnt > 0) {
      conn.release();
      return res.status(400).json({ message: `Não é possível excluir: existem ${respCnt} atividades atribuídas e ${creatorCnt} atividades criadas por este usuário. Remova ou reatribua antes de excluir.` });
    }

    // Delete user
    await conn.query('DELETE FROM users WHERE id = ?', [id]);
    conn.release();

    res.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

module.exports = router;