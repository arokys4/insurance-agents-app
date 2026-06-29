const express = require('express');
const path = require('path');
const fs = require('fs');
const { addAuditLog } = require('../utils/audit');

const uploadDirectory = path.join(__dirname, '../../uploads');

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
    error: 'Brak uprawnień do danych wybranego agenta.'
  });
}

function validateMeetingData(data) {
  const title = (data.title || '').trim();
  const description = (data.description || '').trim();
  const meetingType = data.meetingType || '';
  const startDate = data.startDate || '';
  const endDate = data.endDate || '';
  const status = data.status || 'Zaplanowane';
  const agentId = Number(data.agentId);

  const allowedTypes = [
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

  if (!title || !meetingType || !startDate || !endDate || !agentId) {
    return {
      valid: false,
      error: 'Uzupełnij wszystkie wymagane pola spotkania.'
    };
  }

  if (!allowedTypes.includes(meetingType)) {
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
      error: 'Nieprawidłowy format daty.'
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

async function getMeetingById(db, id) {
  return db.get(
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
}

function formatDateTimeForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function calculateDurationMs(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return end.getTime() - start.getTime();
}

async function findMeetingConflict(db, agentId, startDate, endDate, ignoredMeetingId = null) {
  const params = [
    agentId,
    endDate,
    startDate
  ];

  let ignoredCondition = '';

  if (ignoredMeetingId !== null) {
    ignoredCondition = 'AND id != ?';
    params.push(ignoredMeetingId);
  }

  return db.get(
    `
    SELECT
      id,
      title,
      start_date AS startDate,
      end_date AS endDate,
      status
    FROM meetings
    WHERE agent_id = ?
      AND start_date < ?
      AND end_date > ?
      ${ignoredCondition}
    ORDER BY start_date ASC
    LIMIT 1
    `,
    params
  );
}

async function suggestNextFreeSlot(db, agentId, startDate, endDate, ignoredMeetingId = null) {
  const durationMs = calculateDurationMs(startDate, endDate);

  let suggestedStart = new Date(startDate);
  let suggestedEnd = new Date(suggestedStart.getTime() + durationMs);

  for (let i = 0; i < 20; i += 1) {
    const conflict = await findMeetingConflict(
      db,
      agentId,
      formatDateTimeForInput(suggestedStart),
      formatDateTimeForInput(suggestedEnd),
      ignoredMeetingId
    );

    if (!conflict) {
      return {
        suggestedStartDate: formatDateTimeForInput(suggestedStart),
        suggestedEndDate: formatDateTimeForInput(suggestedEnd)
      };
    }

    suggestedStart = new Date(conflict.endDate);
    suggestedEnd = new Date(suggestedStart.getTime() + durationMs);
  }

  return null;
}

async function buildConflictResponse(db, agentId, startDate, endDate, ignoredMeetingId = null) {
  const conflict = await findMeetingConflict(
    db,
    agentId,
    startDate,
    endDate,
    ignoredMeetingId
  );

  if (!conflict) {
    return null;
  }

  const suggestion = await suggestNextFreeSlot(
    db,
    agentId,
    startDate,
    endDate,
    ignoredMeetingId
  );

  return {
    error: 'Agent ma już spotkanie w wybranym terminie.',
    conflict: {
      id: conflict.id,
      title: conflict.title,
      startDate: conflict.startDate,
      endDate: conflict.endDate,
      status: conflict.status
    },
    suggestedStartDate: suggestion ? suggestion.suggestedStartDate : null,
    suggestedEndDate: suggestion ? suggestion.suggestedEndDate : null
  };
}

function meetingsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const whereClause = isAdmin(req) ? '' : 'WHERE meetings.agent_id = ?';
      const params = isAdmin(req) ? [] : [req.user.id];

      const meetings = await db.all(
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
        ${whereClause}
        ORDER BY meetings.start_date ASC
        `,
        params
      );

      res.json(meetings);
    } catch (error) {
      console.error('Błąd pobierania spotkań:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać listy spotkań.'
      });
    }
  });

  router.get('/agent/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;

      if (!canAccessAgent(req, agentId)) {
        return denyAccess(res);
      }

      const meetings = await db.all(
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
        WHERE meetings.agent_id = ?
        ORDER BY meetings.start_date ASC
        `,
        [agentId]
      );

      res.json(meetings);
    } catch (error) {
      console.error('Błąd pobierania spotkań agenta:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać spotkań agenta.'
      });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const meeting = await getMeetingById(db, id);

      if (!meeting) {
        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
        });
      }

      if (!canAccessAgent(req, meeting.agentId)) {
        return denyAccess(res);
      }

      res.json(meeting);
    } catch (error) {
      console.error('Błąd pobierania spotkania:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać spotkania.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Tylko administrator może dodawać spotkania.' });
      }

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
        SELECT id, first_name AS firstName, last_name AS lastName, status, role
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
          error: 'Nie można przypisać spotkania do administratora.'
        });
      }

      if (agent.status !== 'Aktywny') {
        return res.status(400).json({
          error: 'Nie można przypisać spotkania do nieaktywnego agenta.'
        });
      }

      const conflictResponse = await buildConflictResponse(
        db,
        agentId,
        startDate,
        endDate
      );

      if (conflictResponse) {
        return res.status(409).json(conflictResponse);
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
        [
          title,
          description,
          meetingType,
          startDate,
          endDate,
          status,
          agentId
        ]
      );

      const createdMeeting = await getMeetingById(db, result.lastID);

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'CREATE_MEETING',
        entityType: 'MEETING',
        entityId: createdMeeting.id,
        description: `Dodano spotkanie "${createdMeeting.title}" dla agenta "${createdMeeting.agentName}".`
      });

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
      if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Tylko administrator może edytować spotkania.' });
      }

      const { id } = req.params;

      const validation = validateMeetingData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const existingMeeting = await getMeetingById(db, id);

      if (!existingMeeting) {
        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
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
        SELECT id, first_name AS firstName, last_name AS lastName, status, role
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
          error: 'Nie można przypisać spotkania do administratora.'
        });
      }

      if (agent.status !== 'Aktywny') {
        return res.status(400).json({
          error: 'Nie można przypisać spotkania do nieaktywnego agenta.'
        });
      }

      const conflictResponse = await buildConflictResponse(
        db,
        agentId,
        startDate,
        endDate,
        Number(id)
      );

      if (conflictResponse) {
        return res.status(409).json(conflictResponse);
      }

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
        [
          title,
          description,
          meetingType,
          startDate,
          endDate,
          status,
          agentId,
          id
        ]
      );

      const updatedMeeting = await getMeetingById(db, id);

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'UPDATE_MEETING',
        entityType: 'MEETING',
        entityId: Number(id),
        description: `Zaktualizowano spotkanie "${updatedMeeting.title}" przypisane do agenta "${updatedMeeting.agentName}".`
      });

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

      const allowedStatuses = [
        'Zaplanowane',
        'W realizacji',
        'Zakończone',
        'Przełożone',
        'Anulowane'
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Nieprawidłowy status spotkania.'
        });
      }

      const meeting = await db.get(
        `
        SELECT
          id,
          title,
          status,
          agent_id AS agentId
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

      if (!canAccessAgent(req, meeting.agentId)) {
        return denyAccess(res);
      }

      const oldStatus = meeting.status;

      await db.run(
        `
        UPDATE meetings
        SET status = ?
        WHERE id = ?
        `,
        [status, id]
      );

      if (oldStatus !== status) {
        await addAuditLog(db, {
          userId: userId || null,
          userRole: userRole || null,
          action: 'UPDATE_MEETING_STATUS',
          entityType: 'MEETING',
          entityId: Number(id),
          description: `Zmieniono status spotkania "${meeting.title}" z "${oldStatus}" na "${status}".`
        });
      }

      const updatedMeeting = await getMeetingById(db, id);

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
      if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Tylko administrator może usuwać spotkania.' });
      }

      const { id } = req.params;

      const meeting = await getMeetingById(db, id);

      if (!meeting) {
        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
        });
      }

      const attachments = await db.all(
        `
        SELECT id, file_name AS fileName
        FROM meeting_attachments
        WHERE meeting_id = ?
        `,
        [id]
      );

      for (const attachment of attachments) {
        const filePath = path.join(uploadDirectory, attachment.fileName);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await db.run(
        `
        DELETE FROM meeting_attachments
        WHERE meeting_id = ?
        `,
        [id]
      );

      await db.run(
        `
        DELETE FROM meeting_notes
        WHERE meeting_id = ?
        `,
        [id]
      );

      await db.run(
        `
        DELETE FROM meetings
        WHERE id = ?
        `,
        [id]
      );

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'DELETE_MEETING',
        entityType: 'MEETING',
        entityId: Number(id),
        description: `Usunięto spotkanie "${meeting.title}" przypisane do agenta "${meeting.agentName}".`
      });

      res.json({
        message: 'Spotkanie oraz powiązane notatki i załączniki zostały usunięte.'
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