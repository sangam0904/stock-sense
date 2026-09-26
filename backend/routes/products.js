const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { search, category_id } = req.query;
  let query = `
    SELECT p.*, c.name as category_name, COALESCE(SUM(s.quantity), 0) as total_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN stock s ON p.id = s.product_id
  `;
  const params = [];

  if (search || category_id) {
    query += ' WHERE 1=1';
    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }
  }

  query += ' GROUP BY p.id';
  
  const products = db.prepare(query).all(...params);
  res.json(products);
});

router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.id = ?
  `).get(req.params.id);
  
  if (!product) return res.status(404).json({ message: 'Product not found' });
  
  const stock = db.prepare(`
    SELECT s.quantity, w.name as warehouse_name 
    FROM stock s 
    JOIN warehouses w ON s.warehouse_id = w.id 
    WHERE s.product_id = ?
  `).all(req.params.id);
  
  res.json({ ...product, stock });
});

router.post('/', (req, res) => {
  const { name, sku, category_id, unit_of_measure, reorder_level, initial_stock, warehouse_id } = req.body;
  
  try {
    const insert = db.prepare('INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level) VALUES (?, ?, ?, ?, ?)');
    const result = insert.run(name, sku, category_id, unit_of_measure || 'Units', reorder_level || 10);
    
    if (initial_stock && warehouse_id) {
      db.prepare('INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
        .run(result.lastInsertRowid, warehouse_id, initial_stock);
        
      db.prepare('INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after) VALUES (?, ?, ?, ?, ?, ?)')
        .run(result.lastInsertRowid, warehouse_id, 'adjustment', 'INITIAL_STOCK', initial_stock, initial_stock);
    }
    
    res.status(201).json({ id: result.lastInsertRowid, message: 'Product created' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ message: 'SKU already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', (req, res) => {
  const { name, sku, category_id, unit_of_measure, reorder_level } = req.body;
  try {
    db.prepare(`
      UPDATE products 
      SET name = COALESCE(?, name), 
          sku = COALESCE(?, sku), 
          category_id = COALESCE(?, category_id), 
          unit_of_measure = COALESCE(?, unit_of_measure), 
          reorder_level = COALESCE(?, reorder_level)
      WHERE id = ?
    `).run(name, sku, category_id, unit_of_measure, reorder_level, req.params.id);
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM stock WHERE product_id = ?').run(req.params.id);
      db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    })();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/stock', (req, res) => {
  const stock = db.prepare(`
    SELECT s.quantity, w.id as warehouse_id, w.name as warehouse_name 
    FROM stock s 
    JOIN warehouses w ON s.warehouse_id = w.id 
    WHERE s.product_id = ?
  `).all(req.params.id);
  res.json(stock);
});

module.exports = router;
