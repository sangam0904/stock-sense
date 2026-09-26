const { initDb } = require('./db/database');
const bcrypt = require('bcryptjs');

async function seedSangamData() {
  const db = await initDb();
  console.log('>>> Seeding Sangam Profile & Advanced Enterprise Data <<<');

  db.transaction(() => {
    // 1. Ensure Sangam profile exists
    const sangamEmail = 'sikarwarsgm123@gmail.com';
    let user = db.prepare('SELECT id FROM users WHERE email = ?').get(sangamEmail);
    const passHash = bcrypt.hashSync('StockSense2026!', 10);

    if (!user) {
      const res = db.prepare(`
        INSERT INTO users (name, email, password, role, department, phone, bio)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Sangam Sikarwar',
        sangamEmail,
        passHash,
        'Head of Supply Chain & Global Operations',
        'Executive Logistics & Inventory Control',
        '+1 (555) 438-9201',
        'Lead operations architect orchestrating multi-facility stock flow, automated cycle counts, and real-time ERP sync for StockSense.'
      );
      console.log('Created user Sangam with ID:', res.lastInsertRowid);
    } else {
      db.prepare(`
        UPDATE users 
        SET name = ?, role = ?, department = ?, phone = ?, bio = ?
        WHERE email = ?
      `).run(
        'Sangam Sikarwar',
        'Head of Supply Chain & Global Operations',
        'Executive Logistics & Inventory Control',
        '+1 (555) 438-9201',
        'Lead operations architect orchestrating multi-facility stock flow, automated cycle counts, and real-time ERP sync for StockSense.',
        sangamEmail
      );
      console.log('Updated existing user Sangam (ID:', user.id, ')');
    }

    // 2. New Categories
    const newCategories = [
      { name: 'Robotics & Automation', description: 'Robotic arms, servo drives, precision actuators, PLC racks' },
      { name: 'Fiber Optics & Laser Sensors', description: 'Optical transceivers, LiDAR units, laser distance meters' },
      { name: 'Cleanroom Labware & PPE', description: 'Electrostatic-free overalls, HEPA filter cartridges, isopropyl wipes' },
      { name: 'Lithium Storage & Energy', description: '48V LiFePO4 rack modules, high-current BMS, thermal pads' }
    ];

    const catMap = {};
    for (const c of newCategories) {
      let existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(c.name);
      if (!existing) {
        const res = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(c.name, c.description);
        catMap[c.name] = res.lastInsertRowid;
      } else {
        catMap[c.name] = existing.id;
      }
    }

    // Get all category IDs
    const allCategories = db.prepare('SELECT id, name FROM categories').all();
    const catLookup = {};
    allCategories.forEach(c => { catLookup[c.name] = c.id; });

    // Warehouses
    const warehouses = db.prepare('SELECT id, name FROM warehouses').all();
    const wh1 = warehouses[0]?.id || 1;
    const wh2 = warehouses[1]?.id || wh1;
    const wh3 = warehouses[2]?.id || wh1;
    const wh4 = warehouses[3]?.id || wh2;
    const wh5 = warehouses[4]?.id || wh1;
    const wh6 = warehouses[5]?.id || wh2;

    // 3. 24 New High-Value Products
    const newProducts = [
      { name: 'ABB 6-Axis Robotic Articulated Arm Core', sku: 'ROB-ABB-6AX', category: 'Robotics & Automation', uom: 'Units', reorder: 3 },
      { name: 'Siemens S7-1500 Modular PLC Controller', sku: 'PLC-SIE-1500', category: 'Robotics & Automation', uom: 'Units', reorder: 5 },
      { name: 'Omron Dual-Channel Safety Relay Block', sku: 'REL-OMR-D24', category: 'Robotics & Automation', uom: 'Units', reorder: 15 },
      { name: 'Harmonic Drive Precision Reduction Gearbox', sku: 'GBX-HAR-P20', category: 'Robotics & Automation', uom: 'Units', reorder: 6 },
      { name: 'Yaskawa Sigma-7 AC Brushless Servomotor 750W', sku: 'MOT-YAS-S750', category: 'Robotics & Automation', uom: 'Units', reorder: 8 },
      
      { name: 'Keyence Dual-Wavelength High-Precision Optical Sensor', sku: 'SNS-KEY-OP2', category: 'Fiber Optics & Laser Sensors', uom: 'Units', reorder: 12 },
      { name: 'SICK TiM781 Outdoor Safety LiDAR 270°', sku: 'LID-SCK-781', category: 'Fiber Optics & Laser Sensors', uom: 'Units', reorder: 4 },
      { name: '100G QSFP28 Single-Mode Fiber Optic Transceiver', sku: 'OPT-QSF-100G', category: 'Fiber Optics & Laser Sensors', uom: 'Pcs', reorder: 25 },
      { name: 'Thorlabs Polarization-Insensitive Optical Isolator', sku: 'ISO-THO-POL', category: 'Fiber Optics & Laser Sensors', uom: 'Units', reorder: 10 },
      { name: 'FLIR A65 Thermal Automation Infrared Camera', sku: 'CAM-FLI-A65', category: 'Fiber Optics & Laser Sensors', uom: 'Units', reorder: 2 },

      { name: 'Class 100 Cleanroom Antistatic Nitrile Gloves (Box 100)', sku: 'PPE-CLN-GLV', category: 'Cleanroom Labware & PPE', uom: 'Boxes', reorder: 40 },
      { name: 'HEPA H14 High-Efficiency Airborne Filtration Core', sku: 'FLT-H14-IND', category: 'Cleanroom Labware & PPE', uom: 'Units', reorder: 14 },
      { name: 'Ultra-Pure 99.9% Electronic Grade Isopropanol (20L Drum)', sku: 'CHM-IPA-20L', category: 'Cleanroom Labware & PPE', uom: 'Drums', reorder: 8 },
      { name: 'DuPont Tyvek 500 Chemical & Particle Coverall (L)', sku: 'PPE-DUP-TYV', category: 'Cleanroom Labware & PPE', uom: 'Pcs', reorder: 30 },
      { name: 'Silicone Free Sticky Cleanroom Floor Mat 30-Layer', sku: 'MAT-CLN-30L', category: 'Cleanroom Labware & PPE', uom: 'Packs', reorder: 15 },

      { name: '48V 100Ah LiFePO4 Server Rack Energy Storage Module', sku: 'BAT-LFP-48100', category: 'Lithium Storage & Energy', uom: 'Units', reorder: 10 },
      { name: 'Victron 5kVA MultiPlus-II Bi-Directional Inverter', sku: 'INV-VIC-5KVA', category: 'Lithium Storage & Energy', uom: 'Units', reorder: 5 },
      { name: 'Amphenol Radsok 350A Quick-Connect Battery Coupler', sku: 'CON-AMP-350A', category: 'Lithium Storage & Energy', uom: 'Pairs', reorder: 50 },
      { name: 'BMS High-Voltage CANbus Battery Management Central', sku: 'BMS-CAN-HV48', category: 'Lithium Storage & Energy', uom: 'Units', reorder: 8 },
      { name: 'Pyrogel XTE High-Temperature Aerogel Thermal Insulation Sheet', sku: 'INS-PYR-XTE', category: 'Rolls', reorder: 12 },

      { name: 'Nordson EFD High-Precision Fluid Dispensing Valve', sku: 'VLV-NOR-EFD', category: 'Robotics & Automation', uom: 'Units', reorder: 6 },
      { name: 'Cognex In-Sight 2D Machine Vision Inspection System', sku: 'VIS-COG-2D8', category: 'Fiber Optics & Laser Sensors', uom: 'Units', reorder: 3 },
      { name: '3M Novec 7100 Engineered Fluid Degreaser 5kg', sku: 'CHM-NOV-7100', category: 'Cleanroom Labware & PPE', uom: 'Canisters', reorder: 7 },
      { name: 'Mean Well 24V 480W DIN-Rail Power Supply Pro', sku: 'PWR-MNW-24V', category: 'Robotics & Automation', uom: 'Units', reorder: 20 }
    ];

    const prodMap = {};
    for (const p of newProducts) {
      const catId = catLookup[p.category] || Object.values(catLookup)[0];
      let existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(p.sku);
      if (!existing) {
        const res = db.prepare(`
          INSERT INTO products (name, sku, category_id, unit_of_measure, reorder_level)
          VALUES (?, ?, ?, ?, ?)
        `).run(p.name, p.sku, catId, p.uom, p.reorder);
        prodMap[p.sku] = res.lastInsertRowid;
      } else {
        prodMap[p.sku] = existing.id;
      }
    }

    // 4. Populate Realistic Stock Quantities across Warehouses
    const stockStmt = db.prepare(`
      INSERT OR REPLACE INTO stock (product_id, warehouse_id, quantity)
      VALUES (?, ?, ?)
    `);

    // Assign stocks: some healthy, some low, some critical
    let idx = 0;
    for (const [sku, pid] of Object.entries(prodMap)) {
      idx++;
      const primaryWh = [wh1, wh2, wh3, wh4, wh5, wh6][idx % 6];
      const secWh = [wh2, wh3, wh4, wh5, wh6, wh1][idx % 6];

      let q1, q2;
      if (idx % 7 === 0) {
        // Critical / Zero stock
        q1 = 0;
        q2 = 1;
      } else if (idx % 3 === 0) {
        // Low stock below reorder
        q1 = Math.floor(Math.random() * 4) + 1;
        q2 = 0;
      } else {
        // Optimal / High stock
        q1 = Math.floor(Math.random() * 85) + 30;
        q2 = Math.floor(Math.random() * 40) + 10;
      }

      stockStmt.run(pid, primaryWh, q1);
      if (q2 > 0) stockStmt.run(pid, secWh, q2);
    }

    // 5. New High-Profile Receipts (Incoming from Global Suppliers)
    const newReceipts = [
      {
        ref: 'REC-2026-EU-089',
        supplier: 'Bosch Rexroth AG - Stuttgart Hub',
        wh: wh1,
        status: 'ready',
        notes: 'Priority air freight consignment. Supervised by Sangam Sikarwar.',
        items: [
          { sku: 'PLC-SIE-1500', exp: 20, rec: 0 },
          { sku: 'MOT-YAS-S750', exp: 15, rec: 0 }
        ]
      },
      {
        ref: 'REC-2026-JP-042',
        supplier: 'Keyence Corporation Japan',
        wh: wh5,
        status: 'done',
        notes: 'Cleanroom sensor arrival inspected and accepted into Cold Storage Bay.',
        items: [
          { sku: 'SNS-KEY-OP2', exp: 35, rec: 35 },
          { sku: 'OPT-QSF-100G', exp: 50, rec: 50 }
        ]
      },
      {
        ref: 'REC-2026-US-115',
        supplier: 'Amphenol Aerospace & Industrial',
        wh: wh3,
        status: 'waiting',
        notes: 'Custom high-current terminal shipment in customs clearance.',
        items: [
          { sku: 'CON-AMP-350A', exp: 120, rec: 0 },
          { sku: 'BAT-LFP-48100', exp: 25, rec: 0 }
        ]
      },
      {
        ref: 'REC-2026-FR-021',
        supplier: 'Schneider Electric France',
        wh: wh2,
        status: 'draft',
        notes: 'Pending final purchase order approval from Sangam.',
        items: [
          { sku: 'REL-OMR-D24', exp: 40, rec: 0 }
        ]
      }
    ];

    for (const r of newReceipts) {
      let existing = db.prepare('SELECT id FROM receipts WHERE reference = ?').get(r.ref);
      if (!existing) {
        const valDate = r.status === 'done' ? new Date().toISOString() : null;
        const res = db.prepare(`
          INSERT INTO receipts (reference, supplier, warehouse_id, status, notes, validated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(r.ref, r.supplier, r.wh, r.status, r.notes, valDate);
        const rId = res.lastInsertRowid;

        for (const item of r.items) {
          const pid = prodMap[item.sku];
          if (pid) {
            db.prepare(`
              INSERT INTO receipt_items (receipt_id, product_id, quantity_expected, quantity_received)
              VALUES (?, ?, ?, ?)
            `).run(rId, pid, item.exp, item.rec);
          }
        }
      }
    }

    // 6. New Deliveries (Outgoing to Key Enterprise Customers)
    const newDeliveries = [
      {
        ref: 'DEL-2026-TS-044',
        customer: 'Tesla Gigafactory Texas - Line 4',
        wh: wh1,
        status: 'ready',
        notes: 'Urgent line replenishment for Battery Pack sub-assembly. Managed by Sangam.',
        items: [
          { sku: 'BAT-LFP-48100', ord: 8, del: 0 },
          { sku: 'CON-AMP-350A', ord: 24, del: 0 }
        ]
      },
      {
        ref: 'DEL-2026-SIE-019',
        customer: 'Siemens Energy Transmission Hub',
        wh: wh2,
        status: 'done',
        notes: 'Complete dispatch signed and confirmed by carrier logistics.',
        items: [
          { sku: 'PLC-SIE-1500', ord: 4, del: 4 },
          { sku: 'PWR-MNW-24V', ord: 12, del: 12 }
        ]
      },
      {
        ref: 'DEL-2026-BOE-008',
        customer: 'Boeing Defense & Space Propulsion',
        wh: wh5,
        status: 'waiting',
        notes: 'Awaiting specialized climate-controlled air transport container.',
        items: [
          { sku: 'LID-SCK-781', ord: 2, del: 0 },
          { sku: 'FLIR-CAM-A65', ord: 1, del: 0 }
        ]
      },
      {
        ref: 'DEL-2026-INT-093',
        customer: 'Intel Semiconductor Fab 52',
        wh: wh5,
        status: 'ready',
        notes: 'Cleanroom spec packaging compliant with ISO Class 3 standard.',
        items: [
          { sku: 'PPE-CLN-GLV', ord: 20, del: 0 },
          { sku: 'CHM-IPA-20L', ord: 4, del: 0 }
        ]
      }
    ];

    for (const d of newDeliveries) {
      let existing = db.prepare('SELECT id FROM deliveries WHERE reference = ?').get(d.ref);
      if (!existing) {
        const valDate = d.status === 'done' ? new Date().toISOString() : null;
        const res = db.prepare(`
          INSERT INTO deliveries (reference, customer, warehouse_id, status, notes, validated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(d.ref, d.customer, d.wh, d.status, d.notes, valDate);
        const dId = res.lastInsertRowid;

        for (const item of d.items) {
          const pid = prodMap[item.sku];
          if (pid) {
            db.prepare(`
              INSERT INTO delivery_items (delivery_id, product_id, quantity_ordered, quantity_delivered)
              VALUES (?, ?, ?, ?)
            `).run(dId, pid, item.ord, item.del);
          }
        }
      }
    }

    // 7. New Transfers & Adjustments
    const newTransfers = [
      {
        ref: 'TRF-2026-X11',
        from: wh1,
        to: wh5,
        status: 'ready',
        notes: 'Reallocating precision optical transceivers to Cold Storage Facility.',
        items: [{ sku: 'OPT-QSF-100G', qty: 15 }]
      },
      {
        ref: 'TRF-2026-X12',
        from: wh3,
        to: wh2,
        status: 'done',
        notes: 'Internal stock shift completed and ledger updated.',
        items: [{ sku: 'PWR-MNW-24V', qty: 10 }]
      }
    ];

    for (const t of newTransfers) {
      let existing = db.prepare('SELECT id FROM transfers WHERE reference = ?').get(t.ref);
      if (!existing) {
        const compDate = t.status === 'done' ? new Date().toISOString() : null;
        const res = db.prepare(`
          INSERT INTO transfers (reference, from_warehouse_id, to_warehouse_id, status, notes, completed_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(t.ref, t.from, t.to, t.status, t.notes, compDate);
        const tId = res.lastInsertRowid;

        for (const item of t.items) {
          const pid = prodMap[item.sku];
          if (pid) {
            db.prepare(`
              INSERT INTO transfer_items (transfer_id, product_id, quantity)
              VALUES (?, ?, ?)
            `).run(tId, pid, item.qty);
          }
        }
      }
    }

    // 8. Add Audit Stock Moves (Stock Ledger Entries)
    const newMoves = [
      {
        sku: 'SNS-KEY-OP2',
        wh: wh5,
        type: 'receipt',
        ref: 'REC-2026-JP-042',
        qty: 35,
        bal: 35,
        date: '2026-09-26 12:15:00'
      },
      {
        sku: 'PLC-SIE-1500',
        wh: wh2,
        type: 'delivery',
        ref: 'DEL-2026-SIE-019',
        qty: -4,
        bal: 16,
        date: '2026-09-26 12:45:00'
      },
      {
        sku: 'PWR-MNW-24V',
        wh: wh2,
        type: 'transfer_in',
        ref: 'TRF-2026-X12',
        qty: 10,
        bal: 28,
        date: '2026-09-26 13:10:00'
      },
      {
        sku: 'BAT-LFP-48100',
        wh: wh1,
        type: 'adjustment',
        ref: 'ADJ-2026-CYC-09',
        qty: 2,
        bal: 14,
        date: '2026-09-26 13:50:00'
      }
    ];

    const moveStmt = db.prepare(`
      INSERT INTO stock_moves (product_id, warehouse_id, move_type, reference, quantity, balance_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const m of newMoves) {
      const pid = prodMap[m.sku];
      if (pid) {
        moveStmt.run(pid, m.wh, m.type, m.ref, m.qty, m.bal, m.date);
      }
    }

    db.save();
    console.log('>>> Enterprise Seeding for Sangam Complete! <<<');
  })();
}

seedSangamData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
