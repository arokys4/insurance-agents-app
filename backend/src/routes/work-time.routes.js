const express = require('express');

function validateWorkTimeData(data) {
  const agentId = Number(data.agentId);
  const workDate = data.workDate || '';
  const startTime = data.startTime || '';
  const endTime = data.endTime || '';
  const description = (data.description || '').trim();

  if (!agentId || !workDate || !startTime || !endTime) {
    return {
      valid: false,
      error: 'Uzupełnij wszystkie wymagane pola ewidencji czasu pracy.'
    };
  }

  const start = new Date(`${workDate}T${startTime}`);
  const end = new Date(`${workDate}T${endTime}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      valid: false,
      error: 'Nieprawidłowy format daty lub godziny.'
    };
  }

  if (end <= start) {
    return {
      valid: false,
      error: 'Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.'
    };
  }

  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  return {
    valid: true,
    entry: {
      agentId,
      workDate,
      startTime,
      endTime,
      description,
      durationHours
    }
  };
}

function workTimeRouter(db) {
  const router = express.Router();

    router.get('/agent/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params;

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
          ORDER BY work_time_entries.work_date DESC, work_time_entries.start_time ASC
          `,
          [agentId]
        );

        const entriesWithDuration = entries.map((entry) => {
          const start = new Date(`${entry.workDate}T${entry.startTime}`);
          const end = new Date(`${entry.workDate}T${entry.endTime}`);
          const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

          return {
            ...entry,
            durationHours
          };
        });

        res.json(entriesWithDuration);
      } catch (error) {
        console.error('Błąd pobierania czasu pracy agenta:', error);

        res.status(500).json({
          error: 'Nie udało się pobrać czasu pracy agenta.'
        });
      }
    });

  router.get('/', async (req, res) => {
    try {
      const entries = await db.all(`
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
        ORDER BY work_time_entries.work_date DESC, work_time_entries.start_time ASC
      `);

      const entriesWithDuration = entries.map((entry) => {
        const start = new Date(`${entry.workDate}T${entry.startTime}`);
        const end = new Date(`${entry.workDate}T${entry.endTime}`);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        return {
          ...entry,
          durationHours
        };
      });

      res.json(entriesWithDuration);
    } catch (error) {
      console.error('Błąd pobierania ewidencji czasu pracy:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać ewidencji czasu pracy.'
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

      const { agentId, workDate, startTime, endTime, description } = validation.entry;

      const agent = await db.get(
        `
        SELECT id
        FROM agents
        WHERE id = ?
        `,
        [agentId]
      );

      if (!agent) {
        return res.status(404).json({
          error: 'Nie znaleziono wybranego agenta.'
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
        [agentId, workDate, startTime, endTime, description]
      );

      const createdEntry = await db.get(
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
        [result.lastID]
      );

      const start = new Date(`${createdEntry.workDate}T${createdEntry.startTime}`);
      const end = new Date(`${createdEntry.workDate}T${createdEntry.endTime}`);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      res.status(201).json({
        ...createdEntry,
        durationHours
      });
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

      const validation = validateWorkTimeData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const existingEntry = await db.get(
        `
        SELECT id
        FROM work_time_entries
        WHERE id = ?
        `,
        [id]
      );

      if (!existingEntry) {
        return res.status(404).json({
          error: 'Nie znaleziono wpisu czasu pracy.'
        });
      }

      const agent = await db.get(
        `
        SELECT id
        FROM agents
        WHERE id = ?
        `,
        [validation.entry.agentId]
      );

      if (!agent) {
        return res.status(404).json({
          error: 'Nie znaleziono wybranego agenta.'
        });
      }

      const { agentId, workDate, startTime, endTime, description } = validation.entry;

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
        [agentId, workDate, startTime, endTime, description, id]
      );

      const updatedEntry = await db.get(
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

      const start = new Date(`${updatedEntry.workDate}T${updatedEntry.startTime}`);
      const end = new Date(`${updatedEntry.workDate}T${updatedEntry.endTime}`);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      res.json({
        ...updatedEntry,
        durationHours
      });
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

      const entry = await db.get(
        `
        SELECT id
        FROM work_time_entries
        WHERE id = ?
        `,
        [id]
      );

      if (!entry) {
        return res.status(404).json({
          error: 'Nie znaleziono wpisu czasu pracy.'
        });
      }

      await db.run(
        `
        DELETE FROM work_time_entries
        WHERE id = ?
        `,
        [id]
      );

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