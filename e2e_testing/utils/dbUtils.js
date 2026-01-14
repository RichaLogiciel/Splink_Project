require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

export async function getPurchasedProducts(programId) {
  const query = `
    SELECT p.id, p.name, pp.quantity
    FROM purchased_products pp
    JOIN products p ON pp.product_id = p.id
    WHERE pp.program_id = $1;
  `;
  const result = await pool.query(query, [programId]);
  return result.rows;
}
