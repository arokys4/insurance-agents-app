const express = require('express');
const { addAuditLog } = require('../utils/audit');

function getRequestUser(req) {
  return {
    userId: req.body.userId || null,
    userRole: req.body.userRole || null
  };
}

async function getMeetingTitle(db, meetingId) {
  const meeting = await db.get(
    `
    SELECT title
    FROM meetings
    WHERE id = ?
    `,
    [meetingId]
  );

  return meeting ? meeting.title : `ID ${meetingId}`;
}

function meetingNotesRouter(db) {
  const router = express.Router();

  router.get('/meeting/:meetingId', async (req, res) => {
    try {
      const { meetingId } = req.params;

      const notes = await db.all(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          content,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM meeting_notes
        WHERE meeting_id = ?
        ORDER BY created_at DESC
        `,
        [meetingId]
      );

      res.json(notes);
    } catch (error) {
      console.error('Błąd pobierania notatek:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać notatek.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const meetingId = Number(req.body.meetingId);
      const content = (req.body.content || '').trim();

      if (!meetingId || !content) {
        return res.status(400).json({
          error: 'Uzupełnij treść notatki.'
        });
      }

      if (content.length < 5) {
        return res.status(400).json({
          error: 'Notatka musi mieć co najmniej 5 znaków.'
        });
      }

      const meeting = await db.get(
        `
        SELECT id, title
        FROM meetings
        WHERE id = ?
        `,
        [meetingId]
      );

      if (!meeting) {
        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
        });
      }

      const result = await db.run(
        `
        INSERT INTO meeting_notes (
          meeting_id,
          content,
          created_at,
          updated_at
        )
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [meetingId, content]
      );

      const createdNote = await db.get(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          content,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM meeting_notes
        WHERE id = ?
        `,
        [result.lastID]
      );

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'CREATE_NOTE',
        entityType: 'MEETING_NOTE',
        entityId: createdNote.id,
        description: `Dodano notatkę do spotkania "${meeting.title}".`
      });

      res.status(201).json(createdNote);
    } catch (error) {
      console.error('Błąd dodawania notatki:', error);

      res.status(500).json({
        error: 'Nie udało się dodać notatki.'
      });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const content = (req.body.content || '').trim();

      if (!content) {
        return res.status(400).json({
          error: 'Uzupełnij treść notatki.'
        });
      }

      if (content.length < 5) {
        return res.status(400).json({
          error: 'Notatka musi mieć co najmniej 5 znaków.'
        });
      }

      const existingNote = await db.get(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          content
        FROM meeting_notes
        WHERE id = ?
        `,
        [id]
      );

      if (!existingNote) {
        return res.status(404).json({
          error: 'Nie znaleziono notatki.'
        });
      }

      await db.run(
        `
        UPDATE meeting_notes
        SET
          content = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [content, id]
      );

      const updatedNote = await db.get(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          content,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM meeting_notes
        WHERE id = ?
        `,
        [id]
      );

      const meetingTitle = await getMeetingTitle(db, updatedNote.meetingId);
      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'UPDATE_NOTE',
        entityType: 'MEETING_NOTE',
        entityId: Number(id),
        description: `Zaktualizowano notatkę do spotkania "${meetingTitle}".`
      });

      res.json(updatedNote);
    } catch (error) {
      console.error('Błąd edycji notatki:', error);

      res.status(500).json({
        error: 'Nie udało się zaktualizować notatki.'
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const note = await db.get(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          content
        FROM meeting_notes
        WHERE id = ?
        `,
        [id]
      );

      if (!note) {
        return res.status(404).json({
          error: 'Nie znaleziono notatki.'
        });
      }

      const meetingTitle = await getMeetingTitle(db, note.meetingId);

      await db.run(
        `
        DELETE FROM meeting_notes
        WHERE id = ?
        `,
        [id]
      );

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'DELETE_NOTE',
        entityType: 'MEETING_NOTE',
        entityId: Number(id),
        description: `Usunięto notatkę ze spotkania "${meetingTitle}".`
      });

      res.json({
        message: 'Notatka została usunięta.'
      });
    } catch (error) {
      console.error('Błąd usuwania notatki:', error);

      res.status(500).json({
        error: 'Nie udało się usunąć notatki.'
      });
    }
  });

  return router;
}

module.exports = meetingNotesRouter;