const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT d.*, w.name as warehouse_name 
    FROM deliveries d 
    JOIN warehouses w ON d.warehouse_id = w.id
  `;
  const params = [];
  
  if (status) {
    query += ' WHERE d.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY d.created_at DESC';
  
  const deliveries = db.prepare(query).all(...params);
  res.json(deliveries);
});

router.get('/:id', (req, res) => {
  const delivery = db.prepare(`
    SELECT d.*, w.name as warehouse_name 
    FROM deliveries d 
    JOIN warehouses w ON d.warehouse_id = w.id 
    WHERE d.id = ?
  `).get(req.params.id);
  
  if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
  
  const items = db.prepare(`
    SELECT di.*, p.name as product_name, p.sku 
    FROM delivery_items di 
    JOIN products p ON di.product_id = p.id 
    WHERE di.delivery_id = ?
  `).all(req.params.id);
  
  res.json({ ...delivery, items });
});

router.post('/', (req, res) => {
  const { customer, warehouse_id, notes, items } = req.body;
  if (!warehouse_id || !items || !items.length) {
    return res.status(400).json({ message: 'Warehouse and items required' });
  }

  const maxId = (db.prepare('SELECT MAX(id) as maxId FROM deliveries').get() || {}).maxId || 0;
  const reference = `DEL-${String(maxId + 1).padStart(4, '0')}`;

  try {
    db.transaction(() => {
      const result = db.prepare('INSERT INTO deliveries (reference, customer, warehouse_id, notes) VALUES (?, ?, ?, ?)')
        .run(reference, customer, warehouse_id, notes);
      
      const deliveryId = result.lastInsertRowid;
      
      const insertItem = db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity_ordered) VALUES (?, ?, ?)');
      for (const item of items) {
        insertItem.run(deliveryId, item.product_id, item.quantity_ordered);
      }
    })();
    res.status(201).json({ message: 'Delivery created', reference });
  } catch (err) {
    console.error('Error creating delivery:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const { customer, notes } = req.body;
  const delivery = db.prepare('SELECT status FROM deliveries WHERE id = ?').get(req.params.id);
  
  if (!delivery || delivery.status !== 'draft') {
    return res.status(400).json({ message: 'Only draft deliveries can be updated' });
  }
  
  db.prepare('UPDATE deliveries SET customer = COALESCE(?, customer), notes = COALESCE(?, notes) WHERE id = ?')
    .run(customer, notes, req.params.id);
  res.json({ message: 'Delivery updated' });
});

// Step 1: Pick items (sets status to 'waiting' / Picking)
router.post('/:id/pick', (req, res) => {
  const delivery = db.prepare('SELECT status FROM deliveries WHERE id = ?').get(req.params.id);
  if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
  if (delivery.status === 'done' || delivery.status === 'canceled') {
    return res.status(400).json({ message: `Cannot pick delivery in ${delivery.status} status` });
  }
  db.prepare("UPDATE deliveries SET status = 'waiting' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Items picked successfully', status: 'waiting' });
});

// Step 2: Pack items (sets status to 'ready' / Packed)
router.post('/:id/pack', (req, res) => {
  const delivery = db.prepare('SELECT status FROM deliveries WHERE id = ?').get(req.params.id);
  if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
  if (delivery.status === 'done' || delivery.status === 'canceled') {
    return res.status(400).json({ message: `Cannot pack delivery in ${delivery.status} status` });
  }
  db.prepare("UPDATE deliveries SET status = 'ready' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Items packed and ready for dispatch', status: 'ready' });
});

router.post('/:id/validate', (req, res) => {
  const deliveryId = req.params.id;
  
  try {
    db.transaction(() => {
      const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(deliveryId);
      if (!delivery || delivery.status === 'done') {
        throw new Error('Delivery not found or already validated');
      }

      const items = db.prepare('SELECT * FROM delivery_items WHERE delivery_id = ?').all(deliveryId);
      
      for (const item of items) {
        const qtyToDeliver = item.quantity_ordered;
        
        // Check stock
        const stock = db.prepare('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?')
          .get(item.product_id, delivery.warehouse_id);
          
        if (!stock || stock.quantity < qtyToDeliver) {
          throw new Error(`Insufficient stock for product ID ${item.product_id}`);
        }
        
        db.prepare('UPDATE delivery_items SET quantity_delivered = ? WHERE id = ?').run(qtyToDeliver, item.id);
        
        // Update stock
        db.prepare('UPDATE stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?')
          .run(qtyToDeliver, item.product_id, delivery.warehouse_id);
        
        const balance = stock.quantity - qtyToDeliver;
          
        // Log move
        db.prepare(`
          INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(item.product_id, delivery.warehouse_id, 'delivery', delivery.reference, qtyToDeliver, balance);
      }
      
      db.prepare("UPDATE deliveries SET status = 'done', validated_at = datetime('now') WHERE id = ?").run(deliveryId);
    })();
    res.json({ message: 'Delivery validated successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/cancel', (req, res) => {
  const delivery = db.prepare('SELECT status FROM deliveries WHERE id = ?').get(req.params.id);
  if (!delivery || delivery.status === 'done') {
    return res.status(400).json({ message: 'Cannot cancel validated delivery' });
  }
  
  db.prepare("UPDATE deliveries SET status = 'canceled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Delivery canceled' });
});

module.exports = router;
