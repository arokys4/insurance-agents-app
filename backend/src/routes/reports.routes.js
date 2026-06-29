const express = require('express');

function reportsRouter(db) {
  const router = express.Router();

  router.get('/overview', async (req, res) => {
    try {
      const summary = await db.get(
        `
        SELECT
          (SELECT COUNT(*) FROM agents WHERE role = 'AGENT') AS agentsCount,
          (SELECT COUNT(*) FROM agents WHERE role = 'AGENT' AND status = 'Aktywny') AS activeAgentsCount,
          (SELECT COUNT(*) FROM meetings) AS meetingsCount,
          (SELECT COUNT(*) FROM meetings WHERE status = 'Zaplanowane') AS plannedMeetingsCount,
          (SELECT COUNT(*) FROM meetings WHERE status = 'Zakończone') AS completedMeetingsCount,
          (SELECT COUNT(*) FROM work_time_entries) AS workTimeEntriesCount
        `
      );

      const workTimeByAgent = await db.all(
        `
        SELECT
          agents.id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName,
          COUNT(work_time_entries.id) AS entriesCount,
          ROUND(
            COALESCE(
              SUM(
                (julianday(work_time_entries.work_date || 'T' || work_time_entries.end_time) -
                 julianday(work_time_entries.work_date || 'T' || work_time_entries.start_time)) * 24
              ),
              0
            ),
            2
          ) AS totalHours
        FROM agents
        LEFT JOIN work_time_entries ON work_time_entries.agent_id = agents.id
        WHERE agents.role = 'AGENT'
        GROUP BY agents.id
        ORDER BY totalHours DESC, agentName ASC
        `
      );

      const meetingsByAgent = await db.all(
        `
        SELECT
          agents.id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName,
          COUNT(meetings.id) AS meetingsCount,
          COALESCE(SUM(CASE WHEN meetings.status = 'Zaplanowane' THEN 1 ELSE 0 END), 0) AS plannedMeetingsCount,
          COALESCE(SUM(CASE WHEN meetings.status = 'Zakończone' THEN 1 ELSE 0 END), 0) AS completedMeetingsCount
        FROM agents
        LEFT JOIN meetings ON meetings.agent_id = agents.id
        WHERE agents.role = 'AGENT'
        GROUP BY agents.id
        ORDER BY meetingsCount DESC, agentName ASC
        `
      );

      res.json({
        summary,
        workTimeByAgent,
        meetingsByAgent
      });
    } catch (error) {
      console.error('Błąd generowania raportu:', error);

      res.status(500).json({
        error: 'Nie udało się wygenerować raportu nadzoru.'
      });
    }
  });

  return router;
}

module.exports = reportsRouter;
