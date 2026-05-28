const express = require('express');
const cors = require('cors');

const { openDatabase } = require('./db/database');

const agentsRouter = require('./routes/agents.routes');
const meetingsRouter = require('./routes/meetings.routes');
const workTimeRouter = require('./routes/work-time.routes');
const meetingNotesRouter = require('./routes/meeting-notes.routes');

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const db = await openDatabase();

  app.get('/api/status', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Backend działa',
      database: 'SQLite'
    });
  });

  app.use('/api/agents', agentsRouter(db));
  app.use('/api/meetings', meetingsRouter(db));
  app.use('/api/work-time', workTimeRouter(db));
  app.use('/api/meeting-notes', meetingNotesRouter(db));

  const PORT = 4000;

  app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
  });
}

startServer();