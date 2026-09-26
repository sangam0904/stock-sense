const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const adjustments = db.prepare(`
    SELECT a.*, w.name as warehouse_name 
    FROM adjustments a 
    JOIN warehouses w ON a.warehouse_id = w.id
    ORDER BY a.created_at DESC
  `).all();
  res.json(adjustments);
});

router.get('/:id', (req, res) => {
  const adjustment = db.prepare(`
    SELECT a.*, w.name as warehouse_name 
    FROM adjustments a 
    JOIN warehouses w ON a.warehouse_id = w.id 
    WHERE a.id = ?
  `).get(req.params.id);
  
  if (!adjustment) return res.status(404).json({ message: 'Adjustment not found' });
  
  const items = db.prepare(`
    SELECT ai.*, p.name as product_name, p.sku 
    FROM adjustment_items ai 
    JOIN products p ON ai.product_id = p.id 
    WHERE ai.adjustment_id = ?
  `).all(req.params.id);
  
  res.json({ ...adjustment, items });
});

router.post('/', (req, res) => {
  const { warehouse_id, reason, notes, items } = req.body;
  if (!warehouse_id || !items || !items.length) {
    return res.status(400).json({ message: 'Warehouse and items required' });
  }

  const maxId = (db.prepare('SELECT MAX(id) as maxId FROM adjustments').get() || {}).maxId || 0;
  const reference = `ADJ-${String(maxId + 1).padStart(4, '0')}`;

  try {
    db.transaction(() => {
      const result = db.prepare('INSERT INTO adjustments (reference, warehouse_id, reason, notes) VALUES (?, ?, ?, ?)')
        .run(reference, warehouse_id, reason, notes);
      
      const adjId = result.lastInsertRowid;
      
      const insertItem = db.prepare('INSERT INTO adjustment_items (adjustment_id, product_id, recorded_qty, counted_qty, difference) VALUES (?, ?, ?, ?, ?)');
      
      for (const item of items) {
        const stock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
          .get(item.product_id, warehouse_id);
        const recorded = stock ? stock.quantity : 0;
        const diff = item.counted_qty - recorded;
        
        insertItem.run(adjId, item.product_id, recorded, item.counted_qty, diff);
      }
    })();
    res.status(201).json({ message: 'Adjustment created', reference });
  } catch (err) {
    console.error('Error creating adjustment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/validate', (req, res) => {
  const adjId = req.params.id;
  
  try {
    db.transaction(() => {
      const adjustment = db.prepare('SELECT * FROM adjustments WHERE id = ?').get(adjId);
      if (!adjustment || adjustment.status === 'done') {
        throw new Error('Adjustment not found or already validated');
      }

      const items = db.prepare('SELECT * FROM adjustment_items WHERE adjustment_id = ?').all(adjId);
      
      for (const item of items) {
        if (item.difference === 0) continue;
        
        // Upsert stock to counted_qty
        db.prepare(`
          INSERT INTO stock (product_id, warehouse_id, quantity) 
          VALUES (?, ?, ?) 
          ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = ?
        `).run(item.product_id, adjustment.warehouse_id, item.counted_qty, item.counted_qty);
        
        // Log move (quantity is the diff)
        db.prepare(`
          INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(item.product_id, adjustment.warehouse_id, 'adjustment', adjustment.reference, item.difference, item.counted_qty);
      }
      
      db.prepare("UPDATE adjustments SET status = 'done' WHERE id = ?").run(adjId);
    })();
    res.json({ message: 'Adjustment validated successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/cancel', (req, res) => {
  const adjustment = db.prepare('SELECT status FROM adjustments WHERE id = ?').get(req.params.id);
  if (!adjustment || adjustment.status === 'done') {
    return res.status(400).json({ message: 'Cannot cancel validated adjustment' });
  }
  
  db.prepare("UPDATE adjustments SET status = 'canceled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Adjustment canceled' });
});

module.exports = router;
