const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT r.*, w.name as warehouse_name 
    FROM receipts r 
    JOIN warehouses w ON r.warehouse_id = w.id
  `;
  const params = [];
  
  if (status) {
    query += ' WHERE r.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY r.created_at DESC';
  
  const receipts = db.prepare(query).all(...params);
  res.json(receipts);
});

router.get('/:id', (req, res) => {
  const receipt = db.prepare(`
    SELECT r.*, w.name as warehouse_name 
    FROM receipts r 
    JOIN warehouses w ON r.warehouse_id = w.id 
    WHERE r.id = ?
  `).get(req.params.id);
  
  if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
  
  const items = db.prepare(`
    SELECT ri.*, p.name as product_name, p.sku 
    FROM receipt_items ri 
    JOIN products p ON ri.product_id = p.id 
    WHERE ri.receipt_id = ?
  `).all(req.params.id);
  
  res.json({ ...receipt, items });
});

router.post('/', (req, res) => {
  const { supplier, warehouse_id, notes, items } = req.body;
  if (!warehouse_id || !items || !items.length) {
    return res.status(400).json({ message: 'Warehouse and items required' });
  }

  const maxId = (db.prepare('SELECT MAX(id) as maxId FROM receipts').get() || {}).maxId || 0;
  const reference = `RCV-${String(maxId + 1).padStart(4, '0')}`;

  try {
    db.transaction(() => {
      const receiptResult = db.prepare('INSERT INTO receipts (reference, supplier, warehouse_id, notes) VALUES (?, ?, ?, ?)')
        .run(reference, supplier, warehouse_id, notes);
      
      const receiptId = receiptResult.lastInsertRowid;
      
      const insertItem = db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity_expected) VALUES (?, ?, ?)');
      for (const item of items) {
        insertItem.run(receiptId, item.product_id, item.quantity_expected);
      }
    })();
    res.status(201).json({ message: 'Receipt created', reference });
  } catch (err) {
    console.error('Error creating receipt:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { supplier, notes } = req.body;
  const receipt = db.prepare('SELECT status FROM receipts WHERE id = ?').get(req.params.id);
  
  if (!receipt || receipt.status !== 'draft') {
    return res.status(400).json({ message: 'Only draft receipts can be updated' });
  }
  
  db.prepare('UPDATE receipts SET supplier = COALESCE(?, supplier), notes = COALESCE(?, notes) WHERE id = ?')
    .run(supplier, notes, req.params.id);
  res.json({ message: 'Receipt updated' });
});

router.post('/:id/validate', (req, res) => {
  const receiptId = req.params.id;
  
  try {
    db.transaction(() => {
      const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
      if (!receipt || receipt.status === 'done') {
        throw new Error('Receipt not found or already validated');
      }

      const items = db.prepare('SELECT * FROM receipt_items WHERE receipt_id = ?').all(receiptId);
      
      for (const item of items) {
        // Assume receiving all expected for simplicity if quantity_received wasn't updated
        const qtyToReceive = item.quantity_expected;
        
        db.prepare('UPDATE receipt_items SET quantity_received = ? WHERE id = ?').run(qtyToReceive, item.id);
        
        // Update stock
        db.prepare(`
          INSERT INTO stock (product_id, warehouse_id, quantity) 
          VALUES (?, ?, ?) 
          ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = quantity + ?
        `).run(item.product_id, receipt.warehouse_id, qtyToReceive, qtyToReceive);
        
        // Get new balance
        const balance = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
          .get(item.product_id, receipt.warehouse_id).quantity;
          
        // Log move
        db.prepare(`
          INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(item.product_id, receipt.warehouse_id, 'receipt', receipt.reference, qtyToReceive, balance);
      }
      
      db.prepare("UPDATE receipts SET status = 'done', validated_at = datetime('now') WHERE id = ?").run(receiptId);
    })();
    res.json({ message: 'Receipt validated successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/cancel', (req, res) => {
  const receipt = db.prepare('SELECT status FROM receipts WHERE id = ?').get(req.params.id);
  if (!receipt || receipt.status === 'done') {
    return res.status(400).json({ message: 'Cannot cancel validated receipt' });
  }
  
  db.prepare("UPDATE receipts SET status = 'canceled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Receipt canceled' });
});

module.exports = router;
