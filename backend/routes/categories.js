const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
});

router.get('/:id', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json(category);
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  
  const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Category created' });
});

router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?')
    .run(name, description, req.params.id);
  res.json({ message: 'Category updated' });
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ message: 'Cannot delete category in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
