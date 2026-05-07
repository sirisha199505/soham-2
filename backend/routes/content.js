const express = require('express');
const pool    = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/content/:levelId
router.get('/:levelId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM content_pages WHERE level_id=$1 ORDER BY page_order, id',
      [req.params.levelId]
    );
    const pages = result.rows.map(r => ({
      page:     r.page_order,
      title:    r.title,
      type:     r.type,
      sections: r.sections || [],
      pdfData:  r.pdf_data  || '',
      pdfName:  r.pdf_name  || '',
    }));
    res.json(pages);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch content.' });
  }
});

// PUT /api/content/:levelId — replace all pages for a level (admin)
router.put('/:levelId', requireAdmin, async (req, res) => {
  const { levelId } = req.params;
  const pages = req.body;
  if (!Array.isArray(pages)) return res.status(400).json({ error: 'Body must be an array.' });

  try {
    await pool.query('DELETE FROM content_pages WHERE level_id=$1', [levelId]);
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      await pool.query(
        `INSERT INTO content_pages (level_id, page_order, title, type, sections, pdf_data, pdf_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [levelId, i, p.title, p.type || 'text', JSON.stringify(p.sections || []), p.pdfData || null, p.pdfName || null]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to save content.' });
  }
});

module.exports = router;
