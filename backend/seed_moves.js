const { initDb } = require('./db/database');

async function seed() {
  const db = await initDb();
  const pCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  
  if (pCount <= 1) {
    console.log('Seeding rich sample products and movements...');
    const insertProd = db.prepare('INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level) VALUES (?, ?, ?, ?, ?)');
    
    // Add Products
    const p2 = insertProd.run('Industrial Bearing 6204', 'BRG-6204', 1, 'Units', 15).lastInsertRowid;
    const p3 = insertProd.run('Hydraulic Hose 1/2in', 'HOS-050', 2, 'Meters', 25).lastInsertRowid;
    const p4 = insertProd.run('LED Worklight 50W', 'LGT-050', 1, 'Units', 10).lastInsertRowid;
    const p5 = insertProd.run('Aluminum Profile 40x40', 'ALU-4040', 2, 'Meters', 30).lastInsertRowid;

    // Add initial stock
    const insertStock = db.prepare('INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)');
    insertStock.run(p2, 1, 80);
    insertStock.run(p2, 2, 40);
    insertStock.run(p3, 1, 150);
    insertStock.run(p4, 1, 60);
    insertStock.run(p5, 2, 200);

    // Add Stock Moves
    const insertMove = db.prepare('INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after) VALUES (?, ?, ?, ?, ?, ?)');
    
    insertMove.run(p2, 1, 'receipt', 'RCV-002', 80, 80);
    insertMove.run(p2, 2, 'transfer_in', 'TRF-001', 40, 40);
    insertMove.run(p3, 1, 'receipt', 'RCV-003', 200, 200);
    insertMove.run(p3, 1, 'delivery', 'DEL-002', 50, 150);
    insertMove.run(p4, 1, 'receipt', 'RCV-004', 65, 65);
    insertMove.run(p4, 1, 'adjustment', 'ADJ-001', 5, 60);
    insertMove.run(p5, 2, 'receipt', 'RCV-005', 200, 200);

    db.save();
    console.log('Successfully seeded rich inventory movements!');
  } else {
    console.log('Products already populated.');
  }
}

seed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
