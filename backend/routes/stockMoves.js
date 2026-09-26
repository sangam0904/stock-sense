const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { product_id, warehouse_id, move_type, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 50);
  
  let query = `
    SELECT m.*, COALESCE(p.name, 'Unknown Product') as product_name, p.sku, COALESCE(w.name, 'Unknown Warehouse') as warehouse_name
    FROM stock_moves m
    LEFT JOIN products p ON m.product_id = p.id
    LEFT JOIN warehouses w ON m.warehouse_id = w.id
    WHERE 1=1
  `;
  const params = [];
  
  if (product_id) {
    query += ' AND m.product_id = ?';
    params.push(product_id);
  }
  if (warehouse_id) {
    query += ' AND m.warehouse_id = ?';
    params.push(warehouse_id);
  }
  if (move_type) {
    query += ' AND m.move_type = ?';
    params.push(move_type);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR m.reference LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  const offset = (page - 1) * limit;
  query += ' ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const moves = db.prepare(query).all(...params);
  
  // Get total count for pagination
  let countQuery = `
    SELECT COUNT(*) as total 
    FROM stock_moves m 
    LEFT JOIN products p ON m.product_id = p.id
    LEFT JOIN warehouses w ON m.warehouse_id = w.id
    WHERE 1=1
  `;
  const countParams = [];
  if (product_id) { countQuery += ' AND m.product_id = ?'; countParams.push(product_id); }
  if (warehouse_id) { countQuery += ' AND m.warehouse_id = ?'; countParams.push(warehouse_id); }
  if (move_type) { countQuery += ' AND m.move_type = ?'; countParams.push(move_type); }
  if (search) {
    countQuery += ' AND (p.name LIKE ? OR p.sku LIKE ? OR m.reference LIKE ?)';
    const searchPattern = `%${search}%`;
    countParams.push(searchPattern, searchPattern, searchPattern);
  }
  
  const total = db.prepare(countQuery).get(...countParams).total;
  
  res.json({
    data: moves,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    }
  });
});

module.exports = router;
