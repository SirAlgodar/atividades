const express = require('express');
const router = express.Router();

// Stub endpoints for sectors to support frontend dropdown
router.get('/', async (req, res) => {
  // No sectors persistence for now; return empty list
  res.json([]);
});

module.exports = router;