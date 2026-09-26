const { initDb } = require('./db/database');

async function seedMassiveData() {
  const db = await initDb();
  console.log('>>> Starting Massive Dummy Data Seeding for All Sections <<<');

  db.transaction(() => {
    // 1. Categories (8 categories)
    const categories = [
      { name: 'Raw Metals & Alloys', description: 'Structural steel, aluminum beams, brass rods, sheet metal' },
      { name: 'Electronics & Sensors', description: 'Microcontrollers, optical sensors, power supplies, relay modules' },
      { name: 'Hydraulic & Pneumatic', description: 'High-pressure hoses, valves, pneumatic cylinders, fittings' },
      { name: 'Fasteners & Hardware', description: 'Grade 8 bolts, precision ball bearings, O-rings, locknuts' },
      { name: 'Finished Assemblies', description: 'Commercial conveyor drives, stepper motors, packaged units' },
      { name: 'Packaging & Shipping', description: 'Pallet wrap, corrugated boxes, strapping, thermal labels' },
      { name: 'Lubricants & Chemicals', description: 'Hydraulic oil ISO 46, bearing grease, threadlocker, degreaser' },
      { name: 'Safety & PPE Supplies', description: 'Cut-resistant gloves, safety goggles, ear protection, hard hats' }
    ];

    const catMap = {};
    for (const c of categories) {
      let existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(c.name);
      if (!existing) {
        const res = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(c.name, c.description);
        catMap[c.name] = res.lastInsertRowid;
      } else {
        catMap[c.name] = existing.id;
      }
    }

    // 2. Warehouses (6 warehouses)
    const warehouses = [
      { name: 'Main Logistics Hub', location: 'Building A - North Bay 1-6', description: 'Central intake, cross-docking, and high-density pallet racking' },
      { name: 'Production Plant Alpha', location: 'Sector 3 - Assembly Line', description: 'Intermediate manufacturing buffer and component shelving' },
      { name: 'Regional Distribution Center', location: 'Gate 14 - Express Depot', description: 'Customer fulfillment, order packing, and rapid outbound dispatch' },
      { name: 'Overflow Storage Yard', location: 'Annex B - Heavy Storage', description: 'Weatherproof bulk structural materials & steel beams' },
      { name: 'Cold & Clean Storage Facility', location: 'Bay 7 - Cleanroom Airflow', description: 'Climate-controlled storage for sensitive electronics & seals' },
      { name: 'West Coast Transit Hub', location: 'Pier 9 Logistics Terminal', description: 'Inter-facility transfer transit dock and shipping containers' }
    ];

    const whMap = {};
    for (const w of warehouses) {
      let existing = db.prepare('SELECT id FROM warehouses WHERE name = ?').get(w.name);
      if (!existing) {
        const res = db.prepare('INSERT INTO warehouses (name, location, description) VALUES (?, ?, ?)').run(w.name, w.location, w.description);
        whMap[w.name] = res.lastInsertRowid;
      } else {
        whMap[w.name] = existing.id;
      }
    }

    const allWhIds = Object.values(whMap);
    const wh1 = allWhIds[0];
    const wh2 = allWhIds[1] || wh1;
    const wh3 = allWhIds[2] || wh1;
    const wh4 = allWhIds[3] || wh2;
    const wh5 = allWhIds[4] || wh1;
    const wh6 = allWhIds[5] || wh2;

    // 3. Products (35 realistic industrial products)
    const products = [
      // Metals
      { name: 'Structural Steel Rods 20mm', sku: 'STL-20MM', cat: 'Raw Metals & Alloys', uom: 'kg', reorder: 40, whStocks: [{ wh: wh1, qty: 380 }, { wh: wh4, qty: 150 }] },
      { name: 'Aluminum Extrusion 40x40 Profile', sku: 'ALU-4040', cat: 'Raw Metals & Alloys', uom: 'Meters', reorder: 50, whStocks: [{ wh: wh2, qty: 220 }, { wh: wh1, qty: 90 }] },
      { name: 'Brass Hexagonal Bar 12mm', sku: 'BRS-012', cat: 'Raw Metals & Alloys', uom: 'kg', reorder: 25, whStocks: [{ wh: wh1, qty: 110 }] },
      { name: 'Stainless Steel Sheet 2mm (4x8ft)', sku: 'SST-SHT02', cat: 'Raw Metals & Alloys', uom: 'Sheets', reorder: 15, whStocks: [{ wh: wh4, qty: 45 }, { wh: wh1, qty: 20 }] },
      { name: 'Galvanized Square Tube 50x50', sku: 'GLV-TUB50', cat: 'Raw Metals & Alloys', uom: 'Meters', reorder: 30, whStocks: [{ wh: wh4, qty: 160 }] },
      { name: 'Copper Round Bar 25mm', sku: 'CPR-BAR25', cat: 'Raw Metals & Alloys', uom: 'kg', reorder: 20, whStocks: [{ wh: wh1, qty: 8 }] }, // Low stock!

      // Electronics
      { name: 'ARM Cortex Controller Board v4', sku: 'MCU-ARM8', cat: 'Electronics & Sensors', uom: 'Units', reorder: 15, whStocks: [{ wh: wh1, qty: 85 }, { wh: wh5, qty: 40 }] },
      { name: 'Optical Proximity Sensor M18 PNP', sku: 'SEN-OPT18', cat: 'Electronics & Sensors', uom: 'Units', reorder: 25, whStocks: [{ wh: wh2, qty: 14 }] }, // Low stock!
      { name: 'Industrial Power Supply 24V 10A DIN', sku: 'PWR-24V', cat: 'Electronics & Sensors', uom: 'Units', reorder: 12, whStocks: [{ wh: wh1, qty: 0 }] }, // OUT OF STOCK!
      { name: 'Solid State Relay 40A 240VAC', sku: 'RLY-SSR40', cat: 'Electronics & Sensors', uom: 'Units', reorder: 20, whStocks: [{ wh: wh5, qty: 65 }] },
      { name: 'Inductive Proximity Sensor M12', sku: 'SEN-IND12', cat: 'Electronics & Sensors', uom: 'Units', reorder: 30, whStocks: [{ wh: wh2, qty: 72 }] },
      { name: 'Emergency Stop Pushbutton 40mm', sku: 'ESTOP-40M', cat: 'Electronics & Sensors', uom: 'Units', reorder: 10, whStocks: [{ wh: wh1, qty: 35 }] },

      // Hydraulics
      { name: 'High-Pressure Hydraulic Hose 1/2in', sku: 'HOS-HP05', cat: 'Hydraulic & Pneumatic', uom: 'Meters', reorder: 60, whStocks: [{ wh: wh3, qty: 280 }, { wh: wh1, qty: 120 }] },
      { name: 'Pneumatic Cylinder 50mm Stroke 100mm', sku: 'CYL-PN50', cat: 'Hydraulic & Pneumatic', uom: 'Units', reorder: 15, whStocks: [{ wh: wh2, qty: 32 }] },
      { name: 'Hydraulic Solenoid Valve 4/3-Way', sku: 'VLV-SOL43', cat: 'Hydraulic & Pneumatic', uom: 'Units', reorder: 8, whStocks: [{ wh: wh1, qty: 18 }] },
      { name: 'Pressure Relief Valve 250 Bar', sku: 'VLV-RLF250', cat: 'Hydraulic & Pneumatic', uom: 'Units', reorder: 10, whStocks: [{ wh: wh3, qty: 5 }] }, // Low stock!
      { name: 'Polyurethane Pneumatic Tubing 8mm', sku: 'TUB-PU08', cat: 'Hydraulic & Pneumatic', uom: 'Roll (100m)', reorder: 10, whStocks: [{ wh: wh2, qty: 24 }] },

      // Fasteners
      { name: 'Precision Ball Bearing 6204-2RS', sku: 'BRG-6204', cat: 'Fasteners & Hardware', uom: 'Units', reorder: 50, whStocks: [{ wh: wh1, qty: 420 }, { wh: wh2, qty: 150 }] },
      { name: 'M8 Stainless Steel Hex Bolt 50mm', sku: 'BLT-M8-50', cat: 'Fasteners & Hardware', uom: 'Box (100)', reorder: 25, whStocks: [{ wh: wh3, qty: 18 }] }, // Low stock!
      { name: 'Viton O-Ring Assortment Kit (382pc)', sku: 'ORG-VIT-K', cat: 'Fasteners & Hardware', uom: 'Kits', reorder: 8, whStocks: [{ wh: wh1, qty: 38 }, { wh: wh5, qty: 12 }] },
      { name: 'High-Tensile Flange Nut M10 Grade 10.9', sku: 'NUT-FLG10', cat: 'Fasteners & Hardware', uom: 'Box (250)', reorder: 20, whStocks: [{ wh: wh1, qty: 65 }] },
      { name: 'Tapered Roller Bearing 32208', sku: 'BRG-TR322', cat: 'Fasteners & Hardware', uom: 'Units', reorder: 15, whStocks: [{ wh: wh3, qty: 45 }] },
      { name: 'Circlip External Retaining Ring 25mm', sku: 'CRG-EXT25', cat: 'Fasteners & Hardware', uom: 'Pack (100)', reorder: 15, whStocks: [{ wh: wh1, qty: 0 }] }, // OUT OF STOCK!

      // Assemblies
      { name: 'Heavy Duty Stepper Motor NEMA 34', sku: 'MTR-NEM34', cat: 'Finished Assemblies', uom: 'Units', reorder: 12, whStocks: [{ wh: wh2, qty: 54 }, { wh: wh3, qty: 25 }] },
      { name: 'Modular Conveyor Drive Unit 1HP 415V', sku: 'CNV-DRV-01', cat: 'Finished Assemblies', uom: 'Units', reorder: 6, whStocks: [{ wh: wh3, qty: 14 }] },
      { name: 'Variable Frequency Drive 2.2kW 3-Phase', sku: 'VFD-22KW', cat: 'Finished Assemblies', uom: 'Units', reorder: 8, whStocks: [{ wh: wh1, qty: 22 }] },
      { name: 'Inline Planetary Gearbox 10:1 Ratio', sku: 'GRB-PLN10', cat: 'Finished Assemblies', uom: 'Units', reorder: 5, whStocks: [{ wh: wh2, qty: 11 }] },

      // Packaging
      { name: 'Industrial Stretch Film Pallet Wrap 20um', sku: 'PKG-STR20', cat: 'Packaging & Shipping', uom: 'Rolls', reorder: 40, whStocks: [{ wh: wh1, qty: 180 }, { wh: wh3, qty: 110 }] },
      { name: 'Heavy Duty Corrugated Box 400x300x250', sku: 'BOX-CR403', cat: 'Packaging & Shipping', uom: 'Pack (25)', reorder: 30, whStocks: [{ wh: wh3, qty: 85 }] },
      { name: 'Thermal Transfer Barcode Labels 4x6in', sku: 'LBL-TT4X6', cat: 'Packaging & Shipping', uom: 'Rolls (1000)', reorder: 20, whStocks: [{ wh: wh1, qty: 55 }] },

      // Lubricants & Chemicals
      { name: 'Hydraulic Oil ISO VG 46 Anti-Wear', sku: 'OIL-HYD46', cat: 'Lubricants & Chemicals', uom: 'Drum (208L)', reorder: 4, whStocks: [{ wh: wh4, qty: 12 }, { wh: wh2, qty: 4 }] },
      { name: 'High-Temperature Lithium Complex Grease', sku: 'GRS-LTH02', cat: 'Lubricants & Chemicals', uom: 'Cartridge (400g)', reorder: 50, whStocks: [{ wh: wh1, qty: 140 }] },
      { name: 'Threadlocker Medium Strength Blue 50ml', sku: 'THD-LCK50', cat: 'Lubricants & Chemicals', uom: 'Bottles', reorder: 25, whStocks: [{ wh: wh2, qty: 62 }] },

      // Safety
      { name: 'Cut-Resistant Nitrile Coated Gloves (L)', sku: 'PPE-GLV-L', cat: 'Safety & PPE Supplies', uom: 'Pair (12pk)', reorder: 30, whStocks: [{ wh: wh1, qty: 95 }, { wh: wh2, qty: 45 }] },
      { name: 'Anti-Fog Safety Glasses Clear UV400', sku: 'PPE-GLS-AF', cat: 'Safety & PPE Supplies', uom: 'Units', reorder: 40, whStocks: [{ wh: wh1, qty: 120 }] }
    ];

    const prodIdMap = {};

    for (const p of products) {
      const catId = catMap[p.cat] || 1;
      let prod = db.prepare('SELECT id FROM products WHERE sku = ?').get(p.sku);
      if (!prod) {
        const res = db.prepare('INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level) VALUES (?, ?, ?, ?, ?)')
          .run(p.name, p.sku, catId, p.uom, p.reorder);
        prodIdMap[p.sku] = res.lastInsertRowid;
      } else {
        prodIdMap[p.sku] = prod.id;
        db.prepare('UPDATE products SET name = ?, category_id = ?, unit_of_measure = ?, reorder_level = ? WHERE id = ?')
          .run(p.name, catId, p.uom, p.reorder, prod.id);
      }

      // Populate stocks per warehouse
      for (const s of p.whStocks) {
        db.prepare(`
          INSERT INTO stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)
          ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = ?
        `).run(prodIdMap[p.sku], s.wh, s.qty, s.qty);
      }
    }

    // 4. Receipts (16 receipts across vendors and dates)
    const receiptsData = [
      { ref: 'RCV-0001', supplier: 'Tata Steel Industrial Co', wh: wh1, status: 'done', date: '-28 days', valDate: '-28 days', notes: 'Bulk steel shipment consignment #401', items: [{ sku: 'STL-20MM', exp: 300, rec: 300 }] },
      { ref: 'RCV-0002', supplier: 'HydroTech Pneumatics Ltd', wh: wh2, status: 'done', date: '-24 days', valDate: '-24 days', notes: 'Aluminum extrusion batches', items: [{ sku: 'ALU-4040', exp: 200, rec: 200 }] },
      { ref: 'RCV-0003', supplier: 'SKF Bearings Global Corp', wh: wh1, status: 'done', date: '-21 days', valDate: '-21 days', notes: 'Quarterly bearing stock delivery', items: [{ sku: 'BRG-6204', exp: 400, rec: 400 }, { sku: 'BRG-TR322', exp: 50, rec: 50 }] },
      { ref: 'RCV-0004', supplier: 'Siemens Industrial Automation', wh: wh5, status: 'done', date: '-18 days', valDate: '-18 days', notes: 'ARM controllers and SSR relays', items: [{ sku: 'MCU-ARM8', exp: 80, rec: 80 }, { sku: 'RLY-SSR40', exp: 60, rec: 60 }] },
      { ref: 'RCV-0005', supplier: 'Parker Hannifin Fluid Systems', wh: wh3, status: 'done', date: '-15 days', valDate: '-15 days', notes: 'High-pressure hydraulic hose reels', items: [{ sku: 'HOS-HP05', exp: 250, rec: 250 }] },
      { ref: 'RCV-0006', supplier: 'Fastenal Industrial Fasteners', wh: wh1, status: 'done', date: '-12 days', valDate: '-12 days', notes: 'Bolts and Viton O-ring sets', items: [{ sku: 'BLT-M8-50', exp: 30, rec: 30 }, { sku: 'ORG-VIT-K', exp: 40, rec: 40 }] },
      { ref: 'RCV-0007', supplier: 'Nidec Motor Corporation', wh: wh2, status: 'done', date: '-9 days', valDate: '-9 days', notes: 'NEMA 34 motors batch intake', items: [{ sku: 'MTR-NEM34', exp: 50, rec: 50 }] },
      { ref: 'RCV-0008', supplier: 'Castrol Industrial Lubricants', wh: wh4, status: 'done', date: '-6 days', valDate: '-6 days', notes: 'ISO 46 hydraulic drums delivery', items: [{ sku: 'OIL-HYD46', exp: 12, rec: 12 }] },
      { ref: 'RCV-0009', supplier: '3M Safety & Packaging Supply', wh: wh1, status: 'done', date: '-3 days', valDate: '-3 days', notes: 'PPE gloves and pallet film', items: [{ sku: 'PPE-GLV-L', exp: 80, rec: 80 }, { sku: 'PKG-STR20', exp: 150, rec: 150 }] },
      
      // Pending / Ready / Waiting
      { ref: 'RCV-0010', supplier: 'Schneider Electric Power Systems', wh: wh1, status: 'ready', date: '-1 days', valDate: null, notes: 'Awaiting QA dock bay signoff for 24V PSUs', items: [{ sku: 'PWR-24V', exp: 25, rec: 0 }] },
      { ref: 'RCV-0011', supplier: 'Omron Automation India Ltd', wh: wh2, status: 'ready', date: '-18 hours', valDate: null, notes: 'Proximity sensor replenishment shipment', items: [{ sku: 'SEN-OPT18', exp: 35, rec: 0 }] },
      { ref: 'RCV-0012', supplier: 'Festo Pneumatics Germany', wh: wh2, status: 'waiting', date: '-10 hours', valDate: null, notes: 'Customs cleared, transit to Gate 3', items: [{ sku: 'CYL-PN50', exp: 20, rec: 0 }, { sku: 'TUB-PU08', exp: 15, rec: 0 }] },
      { ref: 'RCV-0013', supplier: 'Wurth Industry Fasteners', wh: wh3, status: 'waiting', date: '-5 hours', valDate: null, notes: 'Stainless steel fasteners replenishment', items: [{ sku: 'BLT-M8-50', exp: 20, rec: 0 }] },
      { ref: 'RCV-0014', supplier: 'Bosch Rexroth Hydraulic Corp', wh: wh1, status: 'draft', date: '-2 hours', valDate: null, notes: 'Upcoming monthly scheduled purchase order', items: [{ sku: 'VLV-SOL43', exp: 15, rec: 0 }] },
      { ref: 'RCV-0015', supplier: 'SEW-Eurodrive Geared Motors', wh: wh3, status: 'draft', date: '-30 mins', valDate: null, notes: 'Draft RFQ for conveyor drives', items: [{ sku: 'CNV-DRV-01', exp: 6, rec: 0 }] },
      { ref: 'RCV-0016', supplier: 'Apex Sheet Metal Suppliers', wh: wh4, status: 'canceled', date: '-20 days', valDate: null, notes: 'Canceled due to supplier quote revision', items: [{ sku: 'SST-SHT02', exp: 25, rec: 0 }] }
    ];

    for (const r of receiptsData) {
      let rec = db.prepare('SELECT id FROM receipts WHERE reference = ?').get(r.ref);
      let recId;
      if (!rec) {
        const res = db.prepare(`
          INSERT INTO receipts (reference, supplier, warehouse_id, status, notes, created_at, validated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now', ?), ${r.valDate ? `datetime('now', '${r.valDate}')` : 'NULL'})
        `).run(r.ref, r.supplier, r.wh, r.status, r.notes, r.date);
        recId = res.lastInsertRowid;
      } else {
        recId = rec.id;
        db.prepare('UPDATE receipts SET supplier = ?, warehouse_id = ?, status = ?, notes = ? WHERE id = ?')
          .run(r.supplier, r.wh, r.status, r.notes, recId);
      }

      // Items
      for (const item of r.items) {
        const pId = prodIdMap[item.sku];
        if (pId) {
          const itemExists = db.prepare('SELECT id FROM receipt_items WHERE receipt_id = ? AND product_id = ?').get(recId, pId);
          if (!itemExists) {
            db.prepare('INSERT INTO receipt_items (receipt_id, product_id, quantity_expected, quantity_received) VALUES (?, ?, ?, ?)')
              .run(recId, pId, item.exp, item.rec);
          }
        }
      }
    }

    // 5. Deliveries (16 customer orders across clients and dates)
    const deliveriesData = [
      { ref: 'DEL-0001', customer: 'Apex Robotics Manufacturing', wh: wh1, status: 'done', date: '-26 days', valDate: '-26 days', notes: 'Structural steel and arm boards dispatch', items: [{ sku: 'STL-20MM', ord: 80, del: 80 }, { sku: 'MCU-ARM8', ord: 15, del: 15 }] },
      { ref: 'DEL-0002', customer: 'Global Conveyor Engineering', wh: wh2, status: 'done', date: '-22 days', valDate: '-22 days', notes: 'Aluminum frame profiles delivery', items: [{ sku: 'ALU-4040', ord: 60, del: 60 }] },
      { ref: 'DEL-0003', customer: 'Cyberdyne Automated Systems', wh: wh1, status: 'done', date: '-19 days', valDate: '-19 days', notes: 'High-precision bearings consignment', items: [{ sku: 'BRG-6204', ord: 120, del: 120 }] },
      { ref: 'DEL-0004', customer: 'MegaCorp Heavy Industries', wh: wh3, status: 'done', date: '-16 days', valDate: '-16 days', notes: 'Hydraulic hose replacement bundle', items: [{ sku: 'HOS-HP05', ord: 90, del: 90 }] },
      { ref: 'DEL-0005', customer: 'Stark Automation Labs', wh: wh2, status: 'done', date: '-13 days', valDate: '-13 days', notes: 'NEMA 34 motors order shipment', items: [{ sku: 'MTR-NEM34', ord: 16, del: 16 }] },
      { ref: 'DEL-0006', customer: 'Precision Machinery Works', wh: wh1, status: 'done', date: '-10 days', valDate: '-10 days', notes: 'Fasteners and hardware supplies', items: [{ sku: 'BLT-M8-50', ord: 12, del: 12 }, { sku: 'ORG-VIT-K', ord: 10, del: 10 }] },
      { ref: 'DEL-0007', customer: 'BioTech Cleanroom Systems', wh: wh5, status: 'done', date: '-7 days', valDate: '-7 days', notes: 'Solid state relays for thermal cabinets', items: [{ sku: 'RLY-SSR40', ord: 25, del: 25 }] },
      { ref: 'DEL-0008', customer: 'Titan Logistics Fleet', wh: wh4, status: 'done', date: '-4 days', valDate: '-4 days', notes: 'ISO 46 hydraulic oil drums', items: [{ sku: 'OIL-HYD46', ord: 6, del: 6 }] },
      { ref: 'DEL-0009', customer: 'Pacific Aerospace Corp', wh: wh3, status: 'done', date: '-2 days', valDate: '-2 days', notes: 'Modular drive unit 1HP expedited dispatch', items: [{ sku: 'CNV-DRV-01', ord: 4, del: 4 }] },

      // Pending / Ready / Waiting / Draft
      { ref: 'DEL-0010', customer: 'Vanguard Defense Solutions', wh: wh1, status: 'ready', date: '-1 days', valDate: null, notes: 'Items picked from Bay 2, pallet staging complete', items: [{ sku: 'BRG-6204', ord: 80, del: 0 }] },
      { ref: 'DEL-0011', customer: 'RoboTech Assembly Lines Inc', wh: wh2, status: 'ready', date: '-14 hours', valDate: null, notes: 'Optical sensors and aluminum frames picking list', items: [{ sku: 'ALU-4040', ord: 35, del: 0 }, { sku: 'SEN-OPT18', ord: 10, del: 0 }] },
      { ref: 'DEL-0012', customer: 'Delta Automation Group', wh: wh3, status: 'waiting', date: '-8 hours', valDate: null, notes: 'Pending carrier truck arrival at Gate 14', items: [{ sku: 'HOS-HP05', ord: 45, del: 0 }] },
      { ref: 'DEL-0013', customer: 'Omega Manufacturing Systems', wh: wh1, status: 'waiting', date: '-4 hours', valDate: null, notes: 'Scheduled for afternoon freight collection', items: [{ sku: 'MCU-ARM8', ord: 12, del: 0 }] },
      { ref: 'DEL-0014', customer: 'Matrix Industrial Automation', wh: wh2, status: 'draft', date: '-2 hours', valDate: null, notes: 'Sales order in progress for approval', items: [{ sku: 'CYL-PN50', ord: 8, del: 0 }] },
      { ref: 'DEL-0015', customer: 'Northstar Energy Equipment', wh: wh3, status: 'draft', date: '-20 mins', valDate: null, notes: 'Customer quotation draft order', items: [{ sku: 'VLV-RLF250', ord: 2, del: 0 }] },
      { ref: 'DEL-0016', customer: 'Atlas Industrial Corp', wh: wh1, status: 'canceled', date: '-15 days', valDate: null, notes: 'Order canceled by client due to project hold', items: [{ sku: 'STL-20MM', ord: 40, del: 0 }] }
    ];

    for (const d of deliveriesData) {
      let del = db.prepare('SELECT id FROM deliveries WHERE reference = ?').get(d.ref);
      let delId;
      if (!del) {
        const res = db.prepare(`
          INSERT INTO deliveries (reference, customer, warehouse_id, status, notes, created_at, validated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now', ?), ${d.valDate ? `datetime('now', '${d.valDate}')` : 'NULL'})
        `).run(d.ref, d.customer, d.wh, d.status, d.notes, d.date);
        delId = res.lastInsertRowid;
      } else {
        delId = del.id;
        db.prepare('UPDATE deliveries SET customer = ?, warehouse_id = ?, status = ?, notes = ? WHERE id = ?')
          .run(d.customer, d.wh, d.status, d.notes, delId);
      }

      for (const item of d.items) {
        const pId = prodIdMap[item.sku];
        if (pId) {
          const itemExists = db.prepare('SELECT id FROM delivery_items WHERE delivery_id = ? AND product_id = ?').get(delId, pId);
          if (!itemExists) {
            db.prepare('INSERT INTO delivery_items (delivery_id, product_id, quantity_ordered, quantity_delivered) VALUES (?, ?, ?, ?)')
              .run(delId, pId, item.ord, item.del);
          }
        }
      }
    }

    // 6. Internal Transfers (10 transfers)
    const transfersData = [
      { ref: 'TRF-0001', from: wh1, to: wh2, status: 'done', date: '-25 days', compDate: '-25 days', notes: 'Feed raw steel & bearings to assembly line', items: [{ sku: 'BRG-6204', qty: 100 }, { sku: 'STL-20MM', qty: 50 }] },
      { ref: 'TRF-0002', from: wh1, to: wh4, status: 'done', date: '-20 days', compDate: '-20 days', notes: 'Move bulk steel rods to overflow yard', items: [{ sku: 'STL-20MM', qty: 100 }] },
      { ref: 'TRF-0003', from: wh1, to: wh5, status: 'done', date: '-17 days', compDate: '-17 days', notes: 'Move ARM boards into climate cleanroom', items: [{ sku: 'MCU-ARM8', qty: 40 }] },
      { ref: 'TRF-0004', from: wh3, to: wh2, status: 'done', date: '-14 days', compDate: '-14 days', notes: 'Supply hydraulic hoses to production cell', items: [{ sku: 'HOS-HP05', qty: 60 }] },
      { ref: 'TRF-0005', from: wh2, to: wh3, status: 'done', date: '-11 days', compDate: '-11 days', notes: 'Finished stepper motors staged for distribution', items: [{ sku: 'MTR-NEM34', qty: 25 }] },
      { ref: 'TRF-0006', from: wh1, to: wh3, status: 'done', date: '-8 days', compDate: '-8 days', notes: 'Packaging materials transfer to regional hub', items: [{ sku: 'PKG-STR20', qty: 60 }] },
      { ref: 'TRF-0007', from: wh1, to: wh2, status: 'ready', date: '-1 days', compDate: null, notes: 'Scheduled morning replenishment pallet', items: [{ sku: 'BRG-6204', qty: 50 }] },
      { ref: 'TRF-0008', from: wh4, to: wh1, status: 'ready', date: '-12 hours', compDate: null, notes: 'Forklift scheduled to move steel sheet stock', items: [{ sku: 'SST-SHT02', qty: 15 }] },
      { ref: 'TRF-0009', from: wh5, to: wh1, status: 'waiting', date: '-4 hours', compDate: null, notes: 'Transfer relays to shipping staging bay', items: [{ sku: 'RLY-SSR40', qty: 20 }] },
      { ref: 'TRF-0010', from: wh2, to: wh6, status: 'draft', date: '-1 hours', compDate: null, notes: 'Draft transfer plan for West Coast terminal', items: [{ sku: 'CNV-DRV-01', qty: 2 }] }
    ];

    for (const t of transfersData) {
      let trf = db.prepare('SELECT id FROM transfers WHERE reference = ?').get(t.ref);
      let trfId;
      if (!trf) {
        const res = db.prepare(`
          INSERT INTO transfers (reference, from_warehouse_id, to_warehouse_id, status, notes, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, datetime('now', ?), ${t.compDate ? `datetime('now', '${t.compDate}')` : 'NULL'})
        `).run(t.ref, t.from, t.to, t.status, t.notes, t.date);
        trfId = res.lastInsertRowid;
      } else {
        trfId = trf.id;
        db.prepare('UPDATE transfers SET from_warehouse_id = ?, to_warehouse_id = ?, status = ?, notes = ? WHERE id = ?')
          .run(t.from, t.to, t.status, t.notes, trfId);
      }

      for (const item of t.items) {
        const pId = prodIdMap[item.sku];
        if (pId) {
          const itemExists = db.prepare('SELECT id FROM transfer_items WHERE transfer_id = ? AND product_id = ?').get(trfId, pId);
          if (!itemExists) {
            db.prepare('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)')
              .run(trfId, pId, item.qty);
          }
        }
      }
    }

    // 7. Adjustments (8 physical inventory cycle counts)
    const adjustmentsData = [
      { ref: 'ADJ-0001', wh: wh1, reason: 'Q1 Physical Stock Count', status: 'done', date: '-23 days', items: [{ sku: 'BRG-6204', rec: 320, cnt: 325, diff: 5 }] },
      { ref: 'ADJ-0002', wh: wh2, reason: 'Damaged during forklift handling', status: 'done', date: '-18 days', items: [{ sku: 'ALU-4040', rec: 225, cnt: 220, diff: -5 }] },
      { ref: 'ADJ-0003', wh: wh3, reason: 'Warehouse aisle reorganization recount', status: 'done', date: '-14 days', items: [{ sku: 'HOS-HP05', rec: 285, cnt: 280, diff: -5 }] },
      { ref: 'ADJ-0004', wh: wh1, reason: 'Annual auditor verification sample', status: 'done', date: '-9 days', items: [{ sku: 'STL-20MM', rec: 382, cnt: 380, diff: -2 }] },
      { ref: 'ADJ-0005', wh: wh5, reason: 'Cleanroom humidity test packaging check', status: 'done', date: '-5 days', items: [{ sku: 'ORG-VIT-K', rec: 13, cnt: 12, diff: -1 }] },
      { ref: 'ADJ-0006', wh: wh2, reason: 'Scrap & damaged item write-off', status: 'done', date: '-2 days', items: [{ sku: 'SEN-OPT18', rec: 16, cnt: 14, diff: -2 }] },
      { ref: 'ADJ-0007', wh: wh1, reason: 'Discrepancy audit on shelf 12B', status: 'waiting', date: '-1 days', items: [{ sku: 'BLT-M8-50', rec: 20, cnt: 18, diff: -2 }] },
      { ref: 'ADJ-0008', wh: wh4, reason: 'Monthly bulk steel weighing', status: 'draft', date: '-6 hours', items: [{ sku: 'GLV-TUB50', rec: 160, cnt: 160, diff: 0 }] }
    ];

    for (const a of adjustmentsData) {
      let adj = db.prepare('SELECT id FROM adjustments WHERE reference = ?').get(a.ref);
      let adjId;
      if (!adj) {
        const res = db.prepare(`
          INSERT INTO adjustments (reference, warehouse_id, reason, status, created_at)
          VALUES (?, ?, ?, ?, datetime('now', ?))
        `).run(a.ref, a.wh, a.reason, a.status, a.date);
        adjId = res.lastInsertRowid;
      } else {
        adjId = adj.id;
        db.prepare('UPDATE adjustments SET warehouse_id = ?, reason = ?, status = ? WHERE id = ?')
          .run(a.wh, a.reason, a.status, adjId);
      }

      for (const item of a.items) {
        const pId = prodIdMap[item.sku];
        if (pId) {
          const itemExists = db.prepare('SELECT id FROM adjustment_items WHERE adjustment_id = ? AND product_id = ?').get(adjId, pId);
          if (!itemExists) {
            db.prepare('INSERT INTO adjustment_items (adjustment_id, product_id, recorded_qty, counted_qty, difference) VALUES (?, ?, ?, ?, ?)')
              .run(adjId, pId, item.rec, item.cnt, item.diff);
          }
        }
      }
    }

    // 8. Stock Moves (60+ historical moves for the ledger)
    // Clear and rebuild clean chronological moves
    db.prepare('DELETE FROM stock_moves').run();

    const movesLog = [
      // 28 days ago
      { sku: 'STL-20MM', wh: wh1, type: 'receipt', ref: 'RCV-0001', qty: 300, bal: 300, date: '-28 days' },
      { sku: 'STL-20MM', wh: wh1, type: 'delivery', ref: 'DEL-0001', qty: 80, bal: 220, date: '-26 days' },
      { sku: 'BRG-6204', wh: wh1, type: 'transfer_out', ref: 'TRF-0001', qty: 100, bal: 400, date: '-25 days' },
      { sku: 'BRG-6204', wh: wh2, type: 'transfer_in', ref: 'TRF-0001', qty: 100, bal: 100, date: '-25 days' },
      { sku: 'ALU-4040', wh: wh2, type: 'receipt', ref: 'RCV-0002', qty: 200, bal: 200, date: '-24 days' },
      { sku: 'BRG-6204', wh: wh1, type: 'adjustment', ref: 'ADJ-0001', qty: 5, bal: 405, date: '-23 days' },
      { sku: 'ALU-4040', wh: wh2, type: 'delivery', ref: 'DEL-0002', qty: 60, bal: 140, date: '-22 days' },
      { sku: 'BRG-6204', wh: wh1, type: 'receipt', ref: 'RCV-0003', qty: 400, bal: 805, date: '-21 days' },
      { sku: 'BRG-TR322', wh: wh1, type: 'receipt', ref: 'RCV-0003', qty: 50, bal: 50, date: '-21 days' },
      { sku: 'STL-20MM', wh: wh1, type: 'transfer_out', ref: 'TRF-0002', qty: 100, bal: 120, date: '-20 days' },
      { sku: 'STL-20MM', wh: wh4, type: 'transfer_in', ref: 'TRF-0002', qty: 100, bal: 100, date: '-20 days' },
      { sku: 'BRG-6204', wh: wh1, type: 'delivery', ref: 'DEL-0003', qty: 120, bal: 685, date: '-19 days' },
      { sku: 'MCU-ARM8', wh: wh5, type: 'receipt', ref: 'RCV-0004', qty: 80, bal: 80, date: '-18 days' },
      { sku: 'RLY-SSR40', wh: wh5, type: 'receipt', ref: 'RCV-0004', qty: 60, bal: 60, date: '-18 days' },
      { sku: 'ALU-4040', wh: wh2, type: 'adjustment', ref: 'ADJ-0002', qty: -5, bal: 135, date: '-18 days' },
      { sku: 'MCU-ARM8', wh: wh1, type: 'transfer_in', ref: 'TRF-0003', qty: 40, bal: 40, date: '-17 days' },
      { sku: 'HOS-HP05', wh: wh3, type: 'receipt', ref: 'RCV-0005', qty: 250, bal: 250, date: '-15 days' },
      { sku: 'HOS-HP05', wh: wh3, type: 'transfer_out', ref: 'TRF-0004', qty: 60, bal: 190, date: '-14 days' },
      { sku: 'HOS-HP05', wh: wh2, type: 'transfer_in', ref: 'TRF-0004', qty: 60, bal: 60, date: '-14 days' },
      { sku: 'BLT-M8-50', wh: wh1, type: 'receipt', ref: 'RCV-0006', qty: 30, bal: 30, date: '-12 days' },
      { sku: 'ORG-VIT-K', wh: wh1, type: 'receipt', ref: 'RCV-0006', qty: 40, bal: 40, date: '-12 days' },
      { sku: 'MTR-NEM34', wh: wh2, type: 'receipt', ref: 'RCV-0007', qty: 50, bal: 50, date: '-9 days' },
      { sku: 'MTR-NEM34', wh: wh2, type: 'transfer_out', ref: 'TRF-0005', qty: 25, bal: 25, date: '-11 days' },
      { sku: 'MTR-NEM34', wh: wh3, type: 'transfer_in', ref: 'TRF-0005', qty: 25, bal: 25, date: '-11 days' },
      { sku: 'BLT-M8-50', wh: wh1, type: 'delivery', ref: 'DEL-0006', qty: 12, bal: 18, date: '-10 days' },
      { sku: 'OIL-HYD46', wh: wh4, type: 'receipt', ref: 'RCV-0008', qty: 12, bal: 12, date: '-6 days' },
      { sku: 'RLY-SSR40', wh: wh5, type: 'delivery', ref: 'DEL-0007', qty: 25, bal: 35, date: '-7 days' },
      { sku: 'OIL-HYD46', wh: wh4, type: 'delivery', ref: 'DEL-0008', qty: 6, bal: 6, date: '-4 days' },
      { sku: 'PPE-GLV-L', wh: wh1, type: 'receipt', ref: 'RCV-0009', qty: 80, bal: 80, date: '-3 days' },
      { sku: 'PKG-STR20', wh: wh1, type: 'receipt', ref: 'RCV-0009', qty: 150, bal: 150, date: '-3 days' },
      { sku: 'CNV-DRV-01', wh: wh3, type: 'delivery', ref: 'DEL-0009', qty: 4, bal: 14, date: '-2 days' },
      { sku: 'SEN-OPT18', wh: wh2, type: 'adjustment', ref: 'ADJ-0006', qty: -2, bal: 14, date: '-2 days' },
      { sku: 'STL-20MM', wh: wh1, type: 'receipt', ref: 'RCV-0010', qty: 260, bal: 380, date: '-1 days' },
      { sku: 'ALU-4040', wh: wh2, type: 'receipt', ref: 'RCV-0011', qty: 85, bal: 220, date: '-18 hours' },
      { sku: 'MTR-NEM34', wh: wh2, type: 'receipt', ref: 'RCV-0012', qty: 29, bal: 54, date: '-10 hours' },
      { sku: 'HOS-HP05', wh: wh3, type: 'receipt', ref: 'RCV-0013', qty: 90, bal: 280, date: '-6 hours' },
      { sku: 'BRG-6204', wh: wh1, type: 'transfer_out', ref: 'TRF-0007', qty: 50, bal: 635, date: '-4 hours' },
      { sku: 'BRG-6204', wh: wh2, type: 'transfer_in', ref: 'TRF-0007', qty: 50, bal: 150, date: '-4 hours' },
      { sku: 'BLT-M8-50', wh: wh3, type: 'adjustment', ref: 'ADJ-0007', qty: -2, bal: 18, date: '-2 hours' },
      { sku: 'CNV-DRV-01', wh: wh3, type: 'receipt', ref: 'RCV-0015', qty: 6, bal: 20, date: '-45 mins' },
      { sku: 'MCU-ARM8', wh: wh1, type: 'receipt', ref: 'RCV-0016', qty: 45, bal: 85, date: '-15 mins' }
    ];

    const insertMoveStmt = db.prepare(`
      INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    for (const m of movesLog) {
      const pId = prodIdMap[m.sku] || 1;
      insertMoveStmt.run(pId, m.wh, m.type, m.ref, m.qty, m.bal, m.date);
    }
  })();

  db.save();
  console.log('>>> Massive Dummy Data Seeding Complete & Persisted! <<<');
}

seedMassiveData().then(() => process.exit(0)).catch(err => {
  console.error('Massive seed error:', err);
  process.exit(1);
});
