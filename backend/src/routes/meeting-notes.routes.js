const express = require('express');

function validateNoteData(data) {
  const meetingId = Number(data.meetingId);
  const content = (data.content || '').trim();

  if (!meetingId || !content) {
    return {
      valid: false,
      error: 'Uzupełnij treść notatki oraz wybierz spotkanie.'
    };
  }

  if (content.length < 5) {
    return {
      valid: false,
      error: 'Notatka musi mieć co najmniej 5 znaków.'
    };
  }

  return {
    valid: true,
    note: {
      meetingId,
      content
    }
  };
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
        error: 'Nie udało się pobrać notatek spotkania.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validation = validateNoteData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const { meetingId, content } = validation.note;

      const meeting = await db.get(
        `
        SELECT id
        FROM meetings
        WHERE id = ?
        `,
        [meetingId]
      );

      if (!meeting) {
        return res.status(404).json({
          error: 'Nie znaleziono wybranego spotkania.'
        });
      }

      const result = await db.run(
        `
        INSERT INTO meeting_notes (meeting_id, content)
        VALUES (?, ?)
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
          error: 'Treść notatki nie może być pusta.'
        });
      }

      if (content.length < 5) {
        return res.status(400).json({
          error: 'Notatka musi mieć co najmniej 5 znaków.'
        });
      }

      const note = await db.get(
        `
        SELECT id
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

      await db.run(
        `
        UPDATE meeting_notes
        SET content = ?, updated_at = CURRENT_TIMESTAMP
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
        SELECT id
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

      await db.run(
        `
        DELETE FROM meeting_notes
        WHERE id = ?
        `,
        [id]
      );

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