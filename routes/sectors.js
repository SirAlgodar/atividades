const express = require('express');
const router = express.Router();
const db = require('../database/db');

// List sectors
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const sectors = await conn.query('SELECT id, name, active FROM sectors ORDER BY name');
    conn.release();
    // Convert BigInt ids
    const data = sectors.map(s => ({ id: Number(s.id), name: s.name, active: !!s.active }));
    res.json(data);
  } catch (err) {
    console.error('Erro ao listar setores:', err);
    res.status(500).json({ message: 'Erro ao listar setores' });
  }
});

// Create sector
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Nome do setor é obrigatório' });
  }
  try {
    const conn = await db.getConnection();
    // Check existing by name
    const [existing] = await conn.query('SELECT id FROM sectors WHERE name = ?', [name]);
    if (existing) {
      conn.release();
      return res.json({ id: Number(existing.id), name });
    }
    const result = await conn.query('INSERT INTO sectors (name, active) VALUES (?, ?)', [name, true]);
    conn.release();
    return res.status(201).json({ id: Number(result.insertId), name });
  } catch (err) {
    console.error('Erro ao criar setor:', err);
    res.status(500).json({ message: 'Erro ao criar setor' });
  }
});

module.exports = router;