const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/kpis', (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  
  // Products where sum of stock < reorder level
  const lowStock = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT p.id, p.reorder_level, COALESCE(SUM(s.quantity), 0) as total_qty
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      GROUP BY p.id
      HAVING total_qty < p.reorder_level AND total_qty > 0
    )
  `).get().count;
  
  const outOfStock = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT p.id, COALESCE(SUM(s.quantity), 0) as total_qty
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      GROUP BY p.id
      HAVING total_qty = 0
    )
  `).get().count;
  
  const pendingReceipts = db.prepare(`SELECT COUNT(*) as count FROM receipts WHERE status IN ('draft', 'waiting', 'ready')`).get().count;
  const pendingDeliveries = db.prepare(`SELECT COUNT(*) as count FROM deliveries WHERE status IN ('draft', 'waiting', 'ready')`).get().count;
  const scheduledTransfers = db.prepare(`SELECT COUNT(*) as count FROM transfers WHERE status IN ('draft', 'waiting', 'ready')`).get().count;
  
  res.json({
    totalProducts,
    lowStockItems: lowStock,
    outOfStockItems: outOfStock,
    pendingReceipts,
    pendingDeliveries,
    scheduledTransfers
  });
});

router.get('/recent-moves', (req, res) => {
  const moves = db.prepare(`
    SELECT m.*, COALESCE(p.name, 'Unknown Product') as product_name, p.sku, COALESCE(w.name, 'Unknown Warehouse') as warehouse_name
    FROM stock_moves m
    LEFT JOIN products p ON m.product_id = p.id
    LEFT JOIN warehouses w ON m.warehouse_id = w.id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 20
  `).all();
  res.json(moves);
});

router.get('/operations', (req, res) => {
  try {
    const receipts = db.prepare(`
      SELECT r.id, 'receipt' as doc_type, r.reference, r.status, r.warehouse_id, 
             COALESCE(w.name, 'Warehouse #' || r.warehouse_id) as warehouse_name,
             COALESCE(r.supplier, 'Vendor') as details, r.created_at,
             (SELECT GROUP_CONCAT(p.category_id) FROM receipt_items ri JOIN products p ON ri.product_id = p.id WHERE ri.receipt_id = r.id) as category_ids,
             (SELECT GROUP_CONCAT(p.name, ', ') FROM receipt_items ri JOIN products p ON ri.product_id = p.id WHERE ri.receipt_id = r.id) as items_summary,
             (SELECT COUNT(*) FROM receipt_items ri WHERE ri.receipt_id = r.id) as item_count
      FROM receipts r
      LEFT JOIN warehouses w ON r.warehouse_id = w.id
    `).all();

    const deliveries = db.prepare(`
      SELECT d.id, 'delivery' as doc_type, d.reference, d.status, d.warehouse_id, 
             COALESCE(w.name, 'Warehouse #' || d.warehouse_id) as warehouse_name,
             COALESCE(d.customer, 'Customer') as details, d.created_at,
             (SELECT GROUP_CONCAT(p.category_id) FROM delivery_items di JOIN products p ON di.product_id = p.id WHERE di.delivery_id = d.id) as category_ids,
             (SELECT GROUP_CONCAT(p.name, ', ') FROM delivery_items di JOIN products p ON di.product_id = p.id WHERE di.delivery_id = d.id) as items_summary,
             (SELECT COUNT(*) FROM delivery_items di WHERE di.delivery_id = d.id) as item_count
    FROM deliveries d
    LEFT JOIN warehouses w ON d.warehouse_id = w.id
    `).all();

    const transfers = db.prepare(`
      SELECT t.id, 'transfer' as doc_type, t.reference, t.status, t.from_warehouse_id as warehouse_id, 
             (COALESCE(fw.name, 'Wh ' || t.from_warehouse_id) || ' ➔ ' || COALESCE(tw.name, 'Wh ' || t.to_warehouse_id)) as warehouse_name,
             'Internal Transfer' as details, t.created_at,
             (SELECT GROUP_CONCAT(p.category_id) FROM transfer_items ti JOIN products p ON ti.product_id = p.id WHERE ti.transfer_id = t.id) as category_ids,
             (SELECT GROUP_CONCAT(p.name, ', ') FROM transfer_items ti JOIN products p ON ti.product_id = p.id WHERE ti.transfer_id = t.id) as items_summary,
             (SELECT COUNT(*) FROM transfer_items ti WHERE ti.transfer_id = t.id) as item_count
      FROM transfers t
      LEFT JOIN warehouses fw ON t.from_warehouse_id = fw.id
      LEFT JOIN warehouses tw ON t.to_warehouse_id = tw.id
    `).all();

    const adjustments = db.prepare(`
      SELECT a.id, 'adjustment' as doc_type, a.reference, a.status, a.warehouse_id, 
             COALESCE(w.name, 'Warehouse #' || a.warehouse_id) as warehouse_name,
             COALESCE(a.reason, 'Physical Count Adjustment') as details, a.created_at,
             (SELECT GROUP_CONCAT(p.category_id) FROM adjustment_items ai JOIN products p ON ai.product_id = p.id WHERE ai.adjustment_id = a.id) as category_ids,
             (SELECT GROUP_CONCAT(p.name, ', ') FROM adjustment_items ai JOIN products p ON ai.product_id = p.id WHERE ai.adjustment_id = a.id) as items_summary,
             (SELECT COUNT(*) FROM adjustment_items ai WHERE ai.adjustment_id = a.id) as item_count
      FROM adjustments a
      LEFT JOIN warehouses w ON a.warehouse_id = w.id
    `).all();

    const allOps = [...receipts, ...deliveries, ...transfers, ...adjustments];
    allOps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(allOps);
  } catch (err) {
    console.error('Error in /operations:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stock-summary', (req, res) => {
  const { warehouse_id } = req.query;
  
  let query = `
    SELECT p.id, p.name, p.sku, COALESCE(SUM(s.quantity), 0) as total_stock
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
  `;
  const params = [];
  
  if (warehouse_id) {
    query += ' AND s.warehouse_id = ?';
    params.push(warehouse_id);
  }
  
  query += ' GROUP BY p.id ORDER BY total_stock DESC LIMIT 10';
  
  const summary = db.prepare(query).all(...params);
  res.json(summary);
});

module.exports = router;
