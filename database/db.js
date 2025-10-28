const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

module.exports = {
  getConnection: async () => {
    try {
      return await pool.getConnection();
    } catch (err) {
      console.error('Database connection error:', err);
      throw err;
    }
  }
};