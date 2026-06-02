const express = require('express');

function auditLogsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const logs = await db.all(
        `
        SELECT
          audit_logs.id,
          audit_logs.user_id AS userId,
          audit_logs.user_role AS userRole,
          audit_logs.action,
          audit_logs.entity_type AS entityType,
          audit_logs.entity_id AS entityId,
          audit_logs.description,
          audit_logs.created_at AS createdAt,
          agents.first_name || ' ' || agents.last_name AS userName
        FROM audit_logs
        LEFT JOIN agents ON agents.id = audit_logs.user_id
        ORDER BY audit_logs.created_at DESC
        `
      );

      res.json(logs);
    } catch (error) {
      console.error('Błąd pobierania audytu zmian:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać audytu zmian.'
      });
    }
  });

  return router;
}

module.exports = auditLogsRouter;