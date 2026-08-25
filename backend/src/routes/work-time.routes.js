const express = require('express');
const { addAuditLog } = require('../utils/audit');

function getRequestUser(req) {
  return {
    userId: req.user?.id || null,
    userRole: req.user?.role || null
  };
}

function isAdmin(req) {
  return req.user?.role === 'ADMIN';
}

function canAccessAgent(req, agentId) {
  return isAdmin(req) || Number(req.user?.id) === Number(agentId);
}

function denyAccess(res) {
  return res.status(403).json({
    error: 'Brak uprawnień do ewidencji czasu pracy wybranego agenta.'
  });
}

function calculateDurationHours(workDate, startTime, endTime) {
  const start = new Date(`${workDate}T${startTime}`);
  const end = new Date(`${workDate}T${endTime}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (end <= start) {
    return null;
  }

  const durationMs = end.getTime() - start.getTime();
  return durationMs / (1000 * 60 * 60);
}

function mapWorkTimeEntry(entry) {
  return {
    ...entry,
    durationHours: calculateDurationHours(
      entry.workDate,
      entry.startTime,
      entry.endTime
    )
  };
}

function validateWorkTimeData(data) {
  const agentId = Number(data.agentId);
  const workDate = data.workDate || '';
  const startTime = data.startTime || '';
  const endTime = data.endTime || '';
  const description = (data.description || '').trim();

  if (!agentId || !workDate || !startTime || !endTime) {
    return {
      valid: false,
      error: 'Uzupełnij agenta, datę oraz godziny pracy.'
    };
  }

  const durationHours = calculateDurationHours(workDate, startTime, endTime);

  if (durationHours === null) {
    return {
      valid: false,
      error: 'Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.'
    };
  }

  return {
    valid: true,
    entry: {
      agentId,
      workDate,
      startTime,
      endTime,
      description
    }
  };
}

async function getWorkTimeEntryById(db, id) {
  const entry = await db.get(
    `
    SELECT
      work_time_entries.id,
      work_time_entries.agent_id AS agentId,
      agents.first_name || ' ' || agents.last_name AS agentName,
      work_time_entries.work_date AS workDate,
      work_time_entries.start_time AS startTime,
      work_time_entries.end_time AS endTime,
      work_time_entries.description
    FROM work_time_entries
    JOIN agents ON agents.id = work_time_entries.agent_id
    WHERE work_time_entries.id = ?
    `,
    [id]
  );

  if (!entry) {
    return null;
  }

  return mapWorkTimeEntry(entry);
}

function workTimeRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const whereClause = isAdmin(req) ? '' : 'WHERE work_time_entries.agent_id = ?';
      const params = isAdmin(req) ? [] : [req.user.id];

      const entries = await db.all(
        `
        SELECT
          work_time_entries.id,
          work_time_entries.agent_id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName,
          work_time_entries.work_date AS workDate,
          work_time_entries.start_time AS startTime,
          work_time_entries.end_time AS endTime,
          work_time_entries.description
        FROM work_time_entries
        JOIN agents ON agents.id = work_time_entries.agent_id
        ${whereClause}
        ORDER BY work_time_entries.work_date DESC, work_time_entries.start_time DESC
        `,
        params
      );

      res.json(entries.map(mapWorkTimeEntry));
    } catch (error) {
      console.error('Błąd pobierania ewidencji czasu pracy:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać ewidencji czasu pracy.'
      });
    }
  });

  router.get('/agent/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;

      if (!canAccessAgent(req, agentId)) {
        return denyAccess(res);
      }

      const entries = await db.all(
        `
        SELECT
          work_time_entries.id,
          work_time_entries.agent_id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName,
          work_time_entries.work_date AS workDate,
          work_time_entries.start_time AS startTime,
          work_time_entries.end_time AS endTime,
          work_time_entries.description
        FROM work_time_entries
        JOIN agents ON agents.id = work_time_entries.agent_id
        WHERE work_time_entries.agent_id = ?
        ORDER BY work_time_entries.work_date DESC, work_time_entries.start_time DESC
        `,
        [agentId]
      );

      res.json(entries.map(mapWorkTimeEntry));
    } catch (error) {
      console.error('Błąd pobierania czasu pracy agenta:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać czasu pracy agenta.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validation = validateWorkTimeData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const {
        agentId,
        workDate,
        startTime,
        endTime,
        description
      } = validation.entry;

      if (!canAccessAgent(req, agentId)) {
        return res.status(403).json({ error: 'Nie możesz przypisać wpisu innemu agentowi.' });
      }

      const agent = await db.get(
        `
        SELECT id, first_name AS firstName, last_name AS lastName, role, status
        FROM agents
        WHERE id = ?
        `,
        [agentId]
      );

      if (!agent) {
        return res.status(404).json({
          error: 'Nie znaleziono agenta.'
        });
      }

      if (agent.role === 'ADMIN') {
        return res.status(400).json({
          error: 'Nie można dodać czasu pracy dla administratora.'
        });
      }

      if (agent.status !== 'Aktywny') {
        return res.status(400).json({
          error: 'Nie można dodać czasu pracy dla nieaktywnego agenta.'
        });
      }

      const result = await db.run(
        `
        INSERT INTO work_time_entries (
          agent_id,
          work_date,
          start_time,
          end_time,
          description
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          agentId,
          workDate,
          startTime,
          endTime,
          description
        ]
      );

      const createdEntry = await getWorkTimeEntryById(db, result.lastID);

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'CREATE_WORK_TIME',
        entityType: 'WORK_TIME_ENTRY',
        entityId: createdEntry.id,
        description: `Dodano wpis czasu pracy agenta "${createdEntry.agentName}" z dnia ${createdEntry.workDate}.`
      });

      res.status(201).json(createdEntry);
    } catch (error) {
      console.error('Błąd dodawania wpisu czasu pracy:', error);

      res.status(500).json({
        error: 'Nie udało się dodać wpisu czasu pracy.'
      });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const existingEntry = await getWorkTimeEntryById(db, id);

      if (!existingEntry) {
        return res.status(404).json({
          error: 'Nie znaleziono wpisu czasu pracy.'
        });
      }

      if (!canAccessAgent(req, existingEntry.agentId)) {
        return res.status(403).json({ error: 'Nie możesz edytować czasu pracy innego agenta.' });
      }

      const validation = validateWorkTimeData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const {
        agentId,
        workDate,
        startTime,
        endTime,
        description
      } = validation.entry;

      if (!canAccessAgent(req, agentId)) {
        return res.status(403).json({ error: 'Nie możesz przypisać wpisu innemu agentowi.' });
      }

      const agent = await db.get(
        `
        SELECT id, first_name AS firstName, last_name AS lastName, role, status
        FROM agents
        WHERE id = ?
        `,
        [agentId]
      );

      if (!agent) {
        return res.status(404).json({
          error: 'Nie znaleziono agenta.'
        });
      }

      if (agent.role === 'ADMIN') {
        return res.status(400).json({
          error: 'Nie można przypisać czasu pracy do administratora.'
        });
      }

      if (agent.status !== 'Aktywny') {
        return res.status(400).json({
          error: 'Nie można przypisać czasu pracy do nieaktywnego agenta.'
        });
      }

      await db.run(
        `
        UPDATE work_time_entries
        SET
          agent_id = ?,
          work_date = ?,
          start_time = ?,
          end_time = ?,
          description = ?
        WHERE id = ?
        `,
        [
          agentId,
          workDate,
          startTime,
          endTime,
          description,
          id
        ]
      );

      const updatedEntry = await getWorkTimeEntryById(db, id);

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'UPDATE_WORK_TIME',
        entityType: 'WORK_TIME_ENTRY',
        entityId: Number(id),
        description: `Zaktualizowano wpis czasu pracy agenta "${updatedEntry.agentName}" z dnia ${updatedEntry.workDate}.`
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error('Błąd edycji wpisu czasu pracy:', error);

      res.status(500).json({
        error: 'Nie udało się zaktualizować wpisu czasu pracy.'
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const entry = await getWorkTimeEntryById(db, id);

      if (!entry) {
        return res.status(404).json({
          error: 'Nie znaleziono wpisu czasu pracy.'
        });
      }

      if (!canAccessAgent(req, entry.agentId)) {
        return res.status(403).json({ error: 'Nie możesz usunąć czasu pracy innego agenta.' });
      }

      await db.run(
        `
        DELETE FROM work_time_entries
        WHERE id = ?
        `,
        [id]
      );

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'DELETE_WORK_TIME',
        entityType: 'WORK_TIME_ENTRY',
        entityId: Number(id),
        description: `Usunięto wpis czasu pracy agenta "${entry.agentName}" z dnia ${entry.workDate}.`
      });

      res.json({
        message: 'Wpis czasu pracy został usunięty.'
      });
    } catch (error) {
      console.error('Błąd usuwania wpisu czasu pracy:', error);

      res.status(500).json({
        error: 'Nie udało się usunąć wpisu czasu pracy.'
      });
    }
  });

  return router;
}

module.exports = workTimeRouter;
