require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'StockSense IMS API' }));

const PORT = process.env.PORT || 3001;

// Initialize database before starting server
initDb().then(() => {
  const authRoutes = require('./routes/auth');
  const productsRoutes = require('./routes/products');
  const categoriesRoutes = require('./routes/categories');
  const warehousesRoutes = require('./routes/warehouses');
  const receiptsRoutes = require('./routes/receipts');
  const deliveriesRoutes = require('./routes/deliveries');
  const transfersRoutes = require('./routes/transfers');
  const adjustmentsRoutes = require('./routes/adjustments');
  const dashboardRoutes = require('./routes/dashboard');
  const stockMovesRoutes = require('./routes/stockMoves');

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/warehouses', warehousesRoutes);
  app.use('/api/receipts', receiptsRoutes);
  app.use('/api/deliveries', deliveriesRoutes);
  app.use('/api/transfers', transfersRoutes);
  app.use('/api/adjustments', adjustmentsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/stock-moves', stockMovesRoutes);

  app.listen(PORT, () => {
    console.log(`StockSense server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
