const express = require('express');
const cors = require('cors');
const path = require('path');

const { openDatabase } = require('./db/database');

const authRouter = require('./routes/auth.routes');
const agentsRouter = require('./routes/agents.routes');
const meetingsRouter = require('./routes/meetings.routes');
const workTimeRouter = require('./routes/work-time.routes');
const meetingNotesRouter = require('./routes/meeting-notes.routes');
const meetingAttachmentsRouter = require('./routes/meeting-attachments.routes');

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  const db = await openDatabase();

  app.get('/api/status', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Backend działa',
      database: 'SQLite'
    });
  });

  app.use('/api/auth', authRouter(db));
  app.use('/api/agents', agentsRouter(db));
  app.use('/api/meetings', meetingsRouter(db));
  app.use('/api/work-time', workTimeRouter(db));
  app.use('/api/meeting-notes', meetingNotesRouter(db));
  app.use('/api/meeting-attachments', meetingAttachmentsRouter(db));
  const PORT = 4000;

  app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
  });
}

startServer();