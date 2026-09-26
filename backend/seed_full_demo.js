const { initDb } = require('./db/database');

async function seedFullDemo() {
  const db = await initDb();
  console.log('--- Starting Full Demo Data Population ---');

  // 1. Ensure Warehouses
  const warehousesData = [
    { name: 'Main Logistics Hub', location: 'Zone A - Bay 1-4', description: 'Primary central intake and bulk pallet storage' },
    { name: 'Production Plant Alpha', location: 'Building 3 - Level 1', description: 'Active assembly line & intermediate component rack' },
    { name: 'Regional Distribution Center', location: 'South Depot - Gate 12', description: 'Fast-dispatch hub for customer order fulfillment' },
    { name: 'Overflow Storage Yard', location: 'Annex B', description: 'Weatherproof heavy raw material storage' }
  ];

  for (const wh of warehousesData) {
    const existing = db.prepare('SELECT id FROM warehouses WHERE name = ?').get(wh.name);
    if (!existing) {
      db.prepare('INSERT INTO warehouses (name, location, description) VALUES (?, ?, ?)').run(wh.name, wh.location, wh.description);
    }
  }

  const allWh = db.prepare('SELECT * FROM warehouses').all();
  const wh1 = allWh[0].id;
  const wh2 = allWh[1]?.id || allWh[0].id;
  const wh3 = allWh[2]?.id || allWh[0].id;
  const wh4 = allWh[3]?.id || allWh[1].id;

  // 2. Ensure Categories
  const categoriesData = [
    { name: 'Raw Metals & Alloys', description: 'Structural steel, aluminum beams, brass tubing' },
    { name: 'Electronics & Sensors', description: 'Controllers, microchips, optical sensors, boards' },
    { name: 'Hydraulic & Pneumatic', description: 'Hoses, high-pressure fittings, fluid reservoirs' },
    { name: 'Fasteners & Hardware', description: 'High-tensile bolts, bearings, clips, O-rings' },
    { name: 'Finished Assemblies', description: 'Packaged commercial units ready for shipment' }
  ];

  for (const cat of categoriesData) {
    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(cat.name);
    if (!existing) {
      db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(cat.name, cat.description);
    }
  }

  const allCats = db.prepare('SELECT * FROM categories').all();
  const cMetals = allCats.find(c => c.name.includes('Metals'))?.id || 1;
  const cElec = allCats.find(c => c.name.includes('Electronics'))?.id || 1;
  const cHydr = allCats.find(c => c.name.includes('Hydraulic'))?.id || 1;
  const cFast = allCats.find(c => c.name.includes('Fasteners'))?.id || 1;
  const cAssy = allCats.find(c => c.name.includes('Finished'))?.id || 1;

  // 3. Products
  const productsData = [
    { name: 'Structural Steel Rods 20mm', sku: 'STL-20MM', category_id: cMetals, uom: 'kg', reorder: 40, wh: wh1, qty: 320 },
    { name: 'Aluminum Extrusion 40x40', sku: 'ALU-4040', category_id: cMetals, uom: 'Meters', reorder: 50, wh: wh2, qty: 180 },
    { name: 'Brass Hex Bar 12mm', sku: 'BRS-012', category_id: cMetals, uom: 'kg', reorder: 20, wh: wh1, qty: 85 },
    { name: 'ARM Cortex Controller Board', sku: 'MCU-ARM8', category_id: cElec, uom: 'Units', reorder: 15, wh: wh1, qty: 65 },
    { name: 'Optical Proximity Sensor M18', sku: 'SEN-OPT18', category_id: cElec, uom: 'Units', reorder: 25, wh: wh2, qty: 12 }, // Low stock!
    { name: 'Industrial Power Supply 24V', sku: 'PWR-24V', category_id: cElec, uom: 'Units', reorder: 10, wh: wh1, qty: 0 }, // Out of stock!
    { name: 'High-Pressure Hydraulic Hose 1/2in', sku: 'HOS-HP05', category_id: cHydr, uom: 'Meters', reorder: 60, wh: wh3, qty: 240 },
    { name: 'Pneumatic Cylinder 50mm Stroke', sku: 'CYL-PN50', category_id: cHydr, uom: 'Units', reorder: 12, wh: wh2, qty: 28 },
    { name: 'Precision Ball Bearing 6204-2RS', sku: 'BRG-6204', category_id: cFast, uom: 'Units', reorder: 50, wh: wh1, qty: 450 },
    { name: 'M8 Stainless Steel Hex Bolt 50mm', sku: 'BLT-M8-50', category_id: cFast, uom: 'Box (100)', reorder: 20, wh: wh3, qty: 18 }, // Low stock!
    { name: 'Viton O-Ring Assortment Kit', sku: 'ORG-VIT-K', category_id: cFast, uom: 'Kits', reorder: 8, wh: wh1, qty: 34 },
    { name: 'Heavy Duty Stepper Motor NEMA 34', sku: 'MTR-NEM34', category_id: cAssy, uom: 'Units', reorder: 10, wh: wh2, qty: 42 },
    { name: 'Modular Conveyor Drive Unit 1HP', sku: 'CNV-DRV-01', category_id: cAssy, uom: 'Units', reorder: 5, wh: wh3, qty: 8 }
  ];

  const prodMap = {};

  for (const p of productsData) {
    let prod = db.prepare('SELECT * FROM products WHERE sku = ?').get(p.sku);
    if (!prod) {
      const res = db.prepare('INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level) VALUES (?, ?, ?, ?, ?)')
        .run(p.name, p.sku, p.category_id, p.uom, p.reorder);
      prod = { id: res.lastInsertRowid, name: p.name, sku: p.sku };
    }
    prodMap[p.sku] = prod.id;

    // Update / insert stock
    db.prepare(`
      INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = ?
    `).run(prod.id, p.wh, p.qty, p.qty);
  }

  // 4. Clean & Seed Historical Stock Moves
  const moveCount = db.prepare('SELECT COUNT(*) as c FROM stock_moves').get().c;
  
  if (moveCount < 15) {
    console.log('Seeding rich historical movements...');
    const insertMove = db.prepare(`
      INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    const p = (sku) => prodMap[sku] || 1;

    insertMove.run(p('STL-20MM'), wh1, 'receipt', 'RCV-0010', 250, 250, '-14 days');
    insertMove.run(p('ALU-4040'), wh2, 'receipt', 'RCV-0011', 200, 200, '-12 days');
    insertMove.run(p('BRG-6204'), wh1, 'receipt', 'RCV-0012', 500, 500, '-10 days');
    insertMove.run(p('MCU-ARM8'), wh1, 'receipt', 'RCV-0013', 80, 80, '-9 days');
    insertMove.run(p('HOS-HP05'), wh3, 'receipt', 'RCV-0014', 300, 300, '-8 days');
    insertMove.run(p('STL-20MM'), wh1, 'delivery', 'DEL-0005', 50, 200, '-7 days');
    insertMove.run(p('BRG-6204'), wh1, 'transfer_out', 'TRF-0004', 50, 450, '-6 days');
    insertMove.run(p('BRG-6204'), wh2, 'transfer_in', 'TRF-0004', 50, 50, '-6 days');
    insertMove.run(p('ALU-4040'), wh2, 'delivery', 'DEL-0006', 20, 180, '-5 days');
    insertMove.run(p('HOS-HP05'), wh3, 'delivery', 'DEL-0007', 60, 240, '-4 days');
    insertMove.run(p('MCU-ARM8'), wh1, 'delivery', 'DEL-0008', 15, 65, '-3 days');
    insertMove.run(p('STL-20MM'), wh1, 'receipt', 'RCV-0015', 120, 320, '-2 days');
    insertMove.run(p('SEN-OPT18'), wh2, 'receipt', 'RCV-0016', 20, 20, '-2 days');
    insertMove.run(p('SEN-OPT18'), wh2, 'delivery', 'DEL-0009', 8, 12, '-1 days');
    insertMove.run(p('MTR-NEM34'), wh2, 'receipt', 'RCV-0017', 50, 50, '-18 hours');
    insertMove.run(p('MTR-NEM34'), wh2, 'delivery', 'DEL-0010', 8, 42, '-10 hours');
    insertMove.run(p('BLT-M8-50'), wh3, 'adjustment', 'ADJ-0003', -2, 18, '-4 hours');
    insertMove.run(p('CNV-DRV-01'), wh3, 'receipt', 'RCV-0018', 8, 8, '-2 hours');
  }

  // 5. Seed Receipts records
  const rcvCount = db.prepare('SELECT COUNT(*) as c FROM receipts').get().c;
  if (rcvCount < 4) {
    const insertRcv = db.prepare('INSERT INTO receipts (reference, supplier, warehouse_id, status, notes, created_at, validated_at) VALUES (?, ?, ?, ?, ?, datetime("now", ?), datetime("now", ?))');
    insertRcv.run('RCV-0010', 'Tata Steel Industrial Co', wh1, 'done', 'Batch #T-884 steel shipment', '-14 days', '-14 days');
    insertRcv.run('RCV-0011', 'HydroTech Pneumatics Ltd', wh2, 'done', 'Aluminum profiles supply', '-12 days', '-12 days');
    insertRcv.run('RCV-0019', 'Bosch Industrial Components', wh1, 'ready', 'Sensor and encoder stock', '-1 days', null);
    insertRcv.run('RCV-0020', 'Siemens Automation GmbH', wh2, 'waiting', 'Pending customs inspection', '-5 hours', null);
  }

  // 6. Seed Deliveries records
  const delCount = db.prepare('SELECT COUNT(*) as c FROM deliveries').get().c;
  if (delCount < 4) {
    const insertDel = db.prepare('INSERT INTO deliveries (reference, customer, warehouse_id, status, notes, created_at, validated_at) VALUES (?, ?, ?, ?, ?, datetime("now", ?), datetime("now", ?))');
    insertDel.run('DEL-0005', 'Apex Robotics Inc', wh1, 'done', 'Export consignment', '-7 days', '-7 days');
    insertDel.run('DEL-0006', 'Global Manufacturing Ltd', wh2, 'done', 'Scheduled weekly delivery', '-5 days', '-5 days');
    insertDel.run('DEL-0011', 'Cyberdyne Automated Systems', wh1, 'ready', 'Awaiting truck arrival at Bay 3', '-6 hours', null);
    insertDel.run('DEL-0012', 'MegaCorp Assembly Plant', wh3, 'waiting', 'Picking items from aisle B', '-2 hours', null);
  }

  // 7. Seed Transfers
  const trfCount = db.prepare('SELECT COUNT(*) as c FROM transfers').get().c;
  if (trfCount < 3) {
    const insertTrf = db.prepare('INSERT INTO transfers (reference, from_warehouse_id, to_warehouse_id, status, notes, created_at, completed_at) VALUES (?, ?, ?, ?, ?, datetime("now", ?), datetime("now", ?))');
    insertTrf.run('TRF-0004', wh1, wh2, 'done', 'Urgent component transfer to production', '-6 days', '-6 days');
    insertTrf.run('TRF-0005', wh2, wh3, 'waiting', 'Internal stock rebalancing to South Depot', '-1 days', null);
    insertTrf.run('TRF-0006', wh1, wh4, 'ready', 'Transfer bulky items to Annex B', '-3 hours', null);
  }

  db.save();
  console.log('--- Full Demo Data Successfully Seeded & Saved to Disk! ---');
}

seedFullDemo().then(() => process.exit(0)).catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
