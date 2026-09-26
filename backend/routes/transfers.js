const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const transfers = db.prepare(`
    SELECT t.*, w1.name as from_warehouse_name, w2.name as to_warehouse_name 
    FROM transfers t 
    JOIN warehouses w1 ON t.from_warehouse_id = w1.id
    JOIN warehouses w2 ON t.to_warehouse_id = w2.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(transfers);
});

router.get('/:id', (req, res) => {
  const transfer = db.prepare(`
    SELECT t.*, w1.name as from_warehouse_name, w2.name as to_warehouse_name 
    FROM transfers t 
    JOIN warehouses w1 ON t.from_warehouse_id = w1.id
    JOIN warehouses w2 ON t.to_warehouse_id = w2.id 
    WHERE t.id = ?
  `).get(req.params.id);
  
  if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
  
  const items = db.prepare(`
    SELECT ti.*, p.name as product_name, p.sku 
    FROM transfer_items ti 
    JOIN products p ON ti.product_id = p.id 
    WHERE ti.transfer_id = ?
  `).all(req.params.id);
  
  res.json({ ...transfer, items });
});

router.post('/', (req, res) => {
  const { from_warehouse_id, to_warehouse_id, notes, items } = req.body;
  if (!from_warehouse_id || !to_warehouse_id || !items || !items.length) {
    return res.status(400).json({ message: 'Source, destination and items required' });
  }

  if (from_warehouse_id === to_warehouse_id) {
    return res.status(400).json({ message: 'Source and destination must be different' });
  }

  const maxId = (db.prepare('SELECT MAX(id) as maxId FROM transfers').get() || {}).maxId || 0;
  const reference = `TRF-${String(maxId + 1).padStart(4, '0')}`;

  try {
    db.transaction(() => {
      const result = db.prepare('INSERT INTO transfers (reference, from_warehouse_id, to_warehouse_id, notes) VALUES (?, ?, ?, ?)')
        .run(reference, from_warehouse_id, to_warehouse_id, notes);
      
      const transferId = result.lastInsertRowid;
      
      const insertItem = db.prepare('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)');
      for (const item of items) {
        insertItem.run(transferId, item.product_id, item.quantity);
      }
    })();
    res.status(201).json({ message: 'Transfer created', reference });
  } catch (err) {
    console.error('Error creating transfer:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/:id/validate', (req, res) => {
  const transferId = req.params.id;
  
  try {
    db.transaction(() => {
      const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(transferId);
      if (!transfer || transfer.status === 'done') {
        throw new Error('Transfer not found or already validated');
      }

      const items = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').all(transferId);
      
      for (const item of items) {
        // Check source stock
        const sourceStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
          .get(item.product_id, transfer.from_warehouse_id);
          
        if (!sourceStock || sourceStock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ID ${item.product_id} in source warehouse`);
        }
        
        // Decrease source
        db.prepare('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?')
          .run(item.quantity, item.product_id, transfer.from_warehouse_id);
          
        // Log out move
        const balSource = sourceStock.quantity - item.quantity;
        db.prepare(`
          INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(item.product_id, transfer.from_warehouse_id, 'transfer_out', transfer.reference, item.quantity, balSource);

        // Increase destination
        db.prepare(`
          INSERT INTO stock (product_id, warehouse_id, quantity) 
          VALUES (?, ?, ?) 
          ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = quantity + ?
        `).run(item.product_id, transfer.to_warehouse_id, item.quantity, item.quantity);
        
        // Log in move
        const destStock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
          .get(item.product_id, transfer.to_warehouse_id).quantity;
          
        db.prepare(`
          INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(item.product_id, transfer.to_warehouse_id, 'transfer_in', transfer.reference, item.quantity, destStock);
      }
      
      db.prepare("UPDATE transfers SET status = 'done', completed_at = datetime('now') WHERE id = ?").run(transferId);
    })();
    res.json({ message: 'Transfer validated successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/cancel', (req, res) => {
  const transfer = db.prepare('SELECT status FROM transfers WHERE id = ?').get(req.params.id);
  if (!transfer || transfer.status === 'done') {
    return res.status(400).json({ message: 'Cannot cancel validated transfer' });
  }
  
  db.prepare("UPDATE transfers SET status = 'canceled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Transfer canceled' });
});

module.exports = router;
