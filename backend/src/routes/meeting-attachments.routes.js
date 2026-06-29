const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addAuditLog } = require('../utils/audit');

const uploadDirectory = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const safeOriginalName = file.originalname.replace(/\s+/g, '_');
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${safeOriginalName}`;

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function getRequestUser(req) {
  return {
    userId: req.user?.id || null,
    userRole: req.user?.role || null
  };
}

function isAdmin(req) {
  return req.user?.role === 'ADMIN';
}

async function canAccessMeeting(db, req, meetingId) {
  if (isAdmin(req)) {
    return true;
  }

  const meeting = await db.get(
    `
    SELECT agent_id AS agentId
    FROM meetings
    WHERE id = ?
    `,
    [meetingId]
  );

  return meeting && Number(meeting.agentId) === Number(req.user?.id);
}

function denyAccess(res) {
  return res.status(403).json({
    error: 'Brak uprawnień do załączników wybranego spotkania.'
  });
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

function meetingAttachmentsRouter(db) {
  const router = express.Router();

  router.get('/meeting/:meetingId', async (req, res) => {
    try {
      const { meetingId } = req.params;

      if (!(await canAccessMeeting(db, req, meetingId))) {
        return denyAccess(res);
      }

      const attachments = await db.all(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          original_name AS originalName,
          file_name AS fileName,
          file_path AS filePath,
          mime_type AS mimeType,
          uploaded_at AS uploadedAt
        FROM meeting_attachments
        WHERE meeting_id = ?
        ORDER BY uploaded_at DESC
        `,
        [meetingId]
      );

      res.json(attachments);
    } catch (error) {
      console.error('Błąd pobierania załączników:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać załączników.'
      });
    }
  });

  router.post('/', upload.single('file'), async (req, res) => {
    try {
      const meetingId = Number(req.body.meetingId);

      if (!meetingId) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(400).json({
          error: 'Nie wskazano spotkania.'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'Nie przesłano pliku.'
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
        fs.unlinkSync(req.file.path);

        return res.status(404).json({
          error: 'Nie znaleziono spotkania.'
        });
      }

      if (!(await canAccessMeeting(db, req, meetingId))) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'Brak uprawnień do dodania załącznika do tego spotkania.' });
      }

      const filePath = `/uploads/${req.file.filename}`;

      const result = await db.run(
        `
        INSERT INTO meeting_attachments (
          meeting_id,
          original_name,
          file_name,
          file_path,
          mime_type,
          uploaded_at
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          meetingId,
          req.file.originalname,
          req.file.filename,
          filePath,
          req.file.mimetype
        ]
      );

      const createdAttachment = await db.get(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          original_name AS originalName,
          file_name AS fileName,
          file_path AS filePath,
          mime_type AS mimeType,
          uploaded_at AS uploadedAt
        FROM meeting_attachments
        WHERE id = ?
        `,
        [result.lastID]
      );

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'UPLOAD_ATTACHMENT',
        entityType: 'MEETING_ATTACHMENT',
        entityId: createdAttachment.id,
        description: `Dodano załącznik "${createdAttachment.originalName}" do spotkania "${meeting.title}".`
      });

      res.status(201).json(createdAttachment);
    } catch (error) {
      console.error('Błąd dodawania załącznika:', error);

      res.status(500).json({
        error: 'Nie udało się dodać załącznika.'
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const attachment = await db.get(
        `
        SELECT
          id,
          meeting_id AS meetingId,
          original_name AS originalName,
          file_name AS fileName
        FROM meeting_attachments
        WHERE id = ?
        `,
        [id]
      );

      if (!attachment) {
        return res.status(404).json({
          error: 'Nie znaleziono załącznika.'
        });
      }

      if (!(await canAccessMeeting(db, req, attachment.meetingId))) {
        return denyAccess(res);
      }

      const meetingTitle = await getMeetingTitle(db, attachment.meetingId);
      const filePath = path.join(uploadDirectory, attachment.fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await db.run(
        `
        DELETE FROM meeting_attachments
        WHERE id = ?
        `,
        [id]
      );

      const { userId, userRole } = getRequestUser(req);

      await addAuditLog(db, {
        userId,
        userRole,
        action: 'DELETE_ATTACHMENT',
        entityType: 'MEETING_ATTACHMENT',
        entityId: Number(id),
        description: `Usunięto załącznik "${attachment.originalName}" ze spotkania "${meetingTitle}".`
      });

      res.json({
        message: 'Załącznik został usunięty.'
      });
    } catch (error) {
      console.error('Błąd usuwania załącznika:', error);

      res.status(500).json({
        error: 'Nie udało się usunąć załącznika.'
      });
    }
  });

  return router;
}

module.exports = meetingAttachmentsRouter;