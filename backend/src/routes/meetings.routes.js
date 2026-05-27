const express = require('express');

const allowedMeetingTypes = [
  'Spotkanie z klientem',
  'Oględziny szkody',
  'Spotkanie wewnętrzne',
  'Inna sprawa'
];

const allowedStatuses = [
  'Zaplanowane',
  'W realizacji',
  'Zakończone',
  'Przełożone',
  'Anulowane'
];

function validateMeetingData(data) {
  const title = (data.title || '').trim();
  const description = (data.description || '').trim();
  const meetingType = data.meetingType || '';
  const startDate = data.startDate || '';
  const endDate = data.endDate || '';
  const status = data.status || 'Zaplanowane';
  const agentId = Number(data.agentId);

  if (!title || !meetingType || !startDate || !endDate || !agentId) {
    return {
      valid: false,
      error: 'Uzupełnij wszystkie wymagane pola spotkania.'
    };
  }

  if (!allowedMeetingTypes.includes(meetingType)) {
    return {
      valid: false,
      error: 'Nieprawidłowy typ spotkania.'
    };
  }

  if (!allowedStatuses.includes(status)) {
    return {
      valid: false,
      error: 'Nieprawidłowy status spotkania.'
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      valid: false,
      error: 'Nieprawidłowy format daty spotkania.'
    };
  }

  if (end <= start) {
    return {
      valid: false,
      error: 'Data zakończenia musi być późniejsza niż data rozpoczęcia.'
    };
  }

  return {
    valid: true,
    meeting: {
      title,
      description,
      meetingType,
      startDate,
      endDate,
      status,
      agentId
    }
  };
}

function meetingsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const meetings = await db.all(`
        SELECT
          meetings.id,
          meetings.title,
          meetings.description,
          meetings.meeting_type AS meetingType,
          meetings.start_date AS startDate,
          meetings.end_date AS endDate,
          meetings.status,
          meetings.agent_id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName
        FROM meetings
        JOIN agents ON agents.id = meetings.agent_id
        ORDER BY meetings.start_date ASC
      `);

      res.json(meetings);
    } catch (error) {
      console.error('Błąd pobierania spotkań:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać listy spotkań.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validation = validateMeetingData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const {
        title,
        description,
        meetingType,
        startDate,
        endDate,
        status,
        agentId
      } = validation.meeting;

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
        INSERT INTO meetings (
          title,
          description,
          meeting_type,
          start_date,
          end_date,
          status,
          agent_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [title, description, meetingType, startDate, endDate, status, agentId]
      );

      const createdMeeting = await db.get(
        `
        SELECT
          meetings.id,
          meetings.title,
          meetings.description,
          meetings.meeting_type AS meetingType,
          meetings.start_date AS startDate,
          meetings.end_date AS endDate,
          meetings.status,
          meetings.agent_id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName
        FROM meetings
        JOIN agents ON agents.id = meetings.agent_id
        WHERE meetings.id = ?
        `,
        [result.lastID]
      );

      res.status(201).json(createdMeeting);
    } catch (error) {
      console.error('Błąd dodawania spotkania:', error);

      res.status(500).json({
        error: 'Nie udało się dodać spotkania.'
      });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const validation = validateMeetingData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const meetingExists = await db.get(
        `
        SELECT id
        FROM meetings
        WHERE id = ?
        `,
        [id]
      );

      if (!meetingExists) {
        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
        });
      }

      const agentExists = await db.get(
        `
        SELECT id
        FROM agents
        WHERE id = ?
        `,
        [validation.meeting.agentId]
      );

      if (!agentExists) {
        return res.status(404).json({
          error: 'Nie znaleziono wybranego agenta.'
        });
      }

      const {
        title,
        description,
        meetingType,
        startDate,
        endDate,
        status,
        agentId
      } = validation.meeting;

      await db.run(
        `
        UPDATE meetings
        SET
          title = ?,
          description = ?,
          meeting_type = ?,
          start_date = ?,
          end_date = ?,
          status = ?,
          agent_id = ?
        WHERE id = ?
        `,
        [title, description, meetingType, startDate, endDate, status, agentId, id]
      );

      const updatedMeeting = await db.get(
        `
        SELECT
          meetings.id,
          meetings.title,
          meetings.description,
          meetings.meeting_type AS meetingType,
          meetings.start_date AS startDate,
          meetings.end_date AS endDate,
          meetings.status,
          meetings.agent_id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName
        FROM meetings
        JOIN agents ON agents.id = meetings.agent_id
        WHERE meetings.id = ?
        `,
        [id]
      );

      res.json(updatedMeeting);
    } catch (error) {
      console.error('Błąd edycji spotkania:', error);

      res.status(500).json({
        error: 'Nie udało się zaktualizować spotkania.'
      });
    }
  });

  router.patch('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Nieprawidłowy status spotkania.'
        });
      }

      const meetingExists = await db.get(
        `
        SELECT id
        FROM meetings
        WHERE id = ?
        `,
        [id]
      );

      if (!meetingExists) {
        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
        });
      }

      await db.run(
        `
        UPDATE meetings
        SET status = ?
        WHERE id = ?
        `,
        [status, id]
      );

      const updatedMeeting = await db.get(
        `
        SELECT
          meetings.id,
          meetings.title,
          meetings.description,
          meetings.meeting_type AS meetingType,
          meetings.start_date AS startDate,
          meetings.end_date AS endDate,
          meetings.status,
          meetings.agent_id AS agentId,
          agents.first_name || ' ' || agents.last_name AS agentName
        FROM meetings
        JOIN agents ON agents.id = meetings.agent_id
        WHERE meetings.id = ?
        `,
        [id]
      );

      res.json(updatedMeeting);
    } catch (error) {
      console.error('Błąd zmiany statusu spotkania:', error);

      res.status(500).json({
        error: 'Nie udało się zmienić statusu spotkania.'
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const meeting = await db.get(
        `
        SELECT id
        FROM meetings
        WHERE id = ?
        `,
        [id]
      );

      if (!meeting) {
        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
        });
      }

      await db.run(
        `
        DELETE FROM meetings
        WHERE id = ?
        `,
        [id]
      );

      res.json({
        message: 'Spotkanie zostało usunięte.'
      });
    } catch (error) {
      console.error('Błąd usuwania spotkania:', error);

      res.status(500).json({
        error: 'Nie udało się usunąć spotkania.'
      });
    }
  });

  return router;
}

module.exports = meetingsRouter;