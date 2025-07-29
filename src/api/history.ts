import { Router } from 'express';
import db from '../database';

const router = Router();

// F-6: 변경 이력 추적
router.get('/:translation_id', (req, res) => {
  const { translation_id } = req.params;

  const query = `
    SELECT
      h.changed_at,
      h.changed_by,
      l.name as language,
      h.old_text,
      h.new_text
    FROM History h
    JOIN Languages l ON h.language_id = l.id
    WHERE h.translation_id = ?
    ORDER BY h.changed_at DESC;
  `;

  db.all(query, [translation_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

export default router;
