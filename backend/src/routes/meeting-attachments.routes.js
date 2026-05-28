const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDirectory = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeOriginalName = file.originalname.replace(/\s+/g, '_');

    cb(null, `${uniqueSuffix}-${safeOriginalName}`);
  }
});

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Dozwolone są tylko pliki PDF oraz obrazy JPG, PNG lub WEBP.'));
    }

    cb(null, true);
  }
});

function meetingAttachmentsRouter(db) {
  const router = express.Router();

  router.get('/meeting/:meetingId', async (req, res) => {
    try {
      const { meetingId } = req.params;

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
        error: 'Nie udało się pobrać załączników spotkania.'
      });
    }
  });

  router.post('/', upload.single('file'), async (req, res) => {
    try {
      const meetingId = Number(req.body.meetingId);

      if (!meetingId) {
        return res.status(400).json({
          error: 'Nie podano identyfikatora spotkania.'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'Nie wybrano pliku.'
        });
      }

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

      const relativePath = `/uploads/${req.file.filename}`;

      const result = await db.run(
        `
        INSERT INTO meeting_attachments (
          meeting_id,
          original_name,
          file_name,
          file_path,
          mime_type
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          meetingId,
          req.file.originalname,
          req.file.filename,
          relativePath,
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

      res.status(201).json(createdAttachment);
    } catch (error) {
      console.error('Błąd dodawania załącznika:', error);

      res.status(500).json({
        error: error.message || 'Nie udało się dodać załącznika.'
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const attachment = await db.get(
        `
        SELECT id, file_name AS fileName
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