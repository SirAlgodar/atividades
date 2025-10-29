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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Test': 'true'
      },
      body: JSON.stringify({ ping: 'ok', timestamp: new Date().toISOString() }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await safeText(resp);
      return res.status(502).json({ success: false, message: `Destino respondeu ${resp.status}: ${text.slice(0,200)}` });
    }
    res.json({ success: true, message: 'Teste de webhook realizado com sucesso' });
  } catch (err) {
    console.error('Falha ao testar webhook:', err && err.message);
    const isAbort = String(err && err.name).includes('AbortError');
    res.status(504).json({ success: false, message: isAbort ? 'Tempo de requisição excedido' : 'Erro ao testar webhook' });
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
    
    // Montar payload conforme campos selecionados
    let fieldsObj = {};
    try {
      fieldsObj = typeof webhookConfig.fields === 'string' ? JSON.parse(webhookConfig.fields) : (webhookConfig.fields || {});
    } catch (_) {}
    const payload = {};
    if (fieldsObj.origin) payload.origin = activity.origin;
    if (fieldsObj.activity) payload.activity = activity.activity;
    if (fieldsObj.date) payload.date = activity.date;
    if (fieldsObj.duration) payload.duration = activity.duration;
    if (fieldsObj.status) payload.status = activity.status;
    if (fieldsObj.priority) payload.priority = activity.priority;
    if (fieldsObj.responsible) payload.responsible = { id: activity.responsible_id, name: activity.responsible_name };
    if (fieldsObj.observation) payload.observation = activity.observation;
    payload.id = activity.id;
    payload.due_date = activity.due_date || null;
    payload.updated_at = activity.updated_at;
    payload.created_at = activity.created_at;

    // Enviar para webhook
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'atividades-app'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await safeText(resp);
      return res.status(502).json({ success: false, message: `Destino respondeu ${resp.status}: ${text.slice(0,200)}` });
    }
    res.json({ success: true, message: 'Dados enviados para o webhook com sucesso' });
  } catch (err) {
    console.error('Falha ao enviar dados para o webhook:', err && err.message);
    const isAbort = String(err && err.name).includes('AbortError');
    res.status(504).json({ success: false, message: isAbort ? 'Tempo de requisição excedido' : 'Erro ao enviar dados para o webhook' });
  }
});

// Helper: read response body safely
async function safeText(resp) {
  try { return await resp.text(); } catch (_) { return ''; }
}

module.exports = router;