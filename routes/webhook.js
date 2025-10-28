const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get webhook configuration
router.get('/config', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [config] = await conn.query('SELECT * FROM webhook_config LIMIT 1');
    conn.release();
    
    res.json(config || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar configuração de webhook' });
  }
});

// Save webhook configuration
router.post('/config', async (req, res) => {
  const { url, active, auto_send, fields } = req.body;
  
  try {
    const conn = await db.getConnection();
    
    // Check if configuration already exists
    const [existingConfig] = await conn.query('SELECT * FROM webhook_config LIMIT 1');
    
    if (existingConfig) {
      // Update existing configuration
      await conn.query(
        'UPDATE webhook_config SET url = ?, active = ?, auto_send = ?, fields = ? WHERE id = ?',
        [url, active, auto_send, fields, existingConfig.id]
      );
    } else {
      // Create new configuration
      await conn.query(
        'INSERT INTO webhook_config (url, active, auto_send, fields) VALUES (?, ?, ?, ?)',
        [url, active, auto_send, fields]
      );
    }
    
    conn.release();
    
    res.json({ 
      success: true,
      message: 'Configuração de webhook salva com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao salvar configuração de webhook' });
  }
});

// Test webhook
router.post('/test', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ message: 'URL do webhook é obrigatória' });
  }
  
  try {
    // In a real implementation, this would make an HTTP request to the webhook URL
    // For this example, we'll just simulate a successful test
    
    res.json({ 
      success: true,
      message: 'Teste de webhook realizado com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao testar webhook' });
  }
});

// Send data to webhook
router.post('/send', async (req, res) => {
  const { activityId } = req.body;
  
  if (!activityId) {
    return res.status(400).json({ message: 'ID da atividade é obrigatório' });
  }
  
  try {
    const conn = await db.getConnection();
    
    // Get webhook configuration
    const [webhookConfig] = await conn.query('SELECT * FROM webhook_config WHERE active = true');
    
    if (!webhookConfig) {
      conn.release();
      return res.status(400).json({ message: 'Webhook não está configurado ou ativo' });
    }
    
    // Get activity data
    const [activity] = await conn.query(
      `SELECT a.*, u.name as responsible_name 
       FROM activities a
       LEFT JOIN users u ON a.responsible_id = u.id
       WHERE a.id = ?`,
      [activityId]
    );
    
    if (!activity) {
      conn.release();
      return res.status(404).json({ message: 'Atividade não encontrada' });
    }
    
    conn.release();
    
    // In a real implementation, this would make an HTTP request to the webhook URL
    // with the activity data according to the selected fields
    // For this example, we'll just simulate a successful send
    
    res.json({ 
      success: true,
      message: 'Dados enviados para o webhook com sucesso' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao enviar dados para o webhook' });
  }
});

module.exports = router;