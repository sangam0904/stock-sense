const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const warehouses = db.prepare(`
    SELECT w.*, COUNT(DISTINCT s.product_id) as product_count
    FROM warehouses w
    LEFT JOIN stock s ON w.id = s.warehouse_id AND s.quantity > 0
    GROUP BY w.id
  `).all();
  res.json(warehouses);
});

router.get('/:id', (req, res) => {
  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
  if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
  res.json(warehouse);
});

router.post('/', (req, res) => {
  const { name, location, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  
  const result = db.prepare('INSERT INTO warehouses (name, location, description) VALUES (?, ?, ?)').run(name, location, description);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Warehouse created' });
});

router.put('/:id', (req, res) => {
  const { name, location, description } = req.body;
  db.prepare('UPDATE warehouses SET name = COALESCE(?, name), location = COALESCE(?, location), description = COALESCE(?, description) WHERE id = ?')
    .run(name, location, description, req.params.id);
  res.json({ message: 'Warehouse updated' });
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM warehouses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Warehouse deleted' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ message: 'Cannot delete warehouse in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
