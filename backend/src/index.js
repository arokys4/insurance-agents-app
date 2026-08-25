const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const { openDatabase } = require('./db/database');
const { requireAuth, requireAdmin } = require('./utils/auth');

const authRouter = require('./routes/auth.routes');
const agentsRouter = require('./routes/agents.routes');
const meetingsRouter = require('./routes/meetings.routes');
const workTimeRouter = require('./routes/work-time.routes');
const meetingNotesRouter = require('./routes/meeting-notes.routes');
const meetingAttachmentsRouter = require('./routes/meeting-attachments.routes');
const auditLogsRouter = require('./routes/audit-logs.routes');
const reportsRouter = require('./routes/reports.routes');

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
  app.use('/api/agents', requireAuth, requireAdmin, agentsRouter(db));
  app.use('/api/meetings', requireAuth, meetingsRouter(db));
  app.use('/api/work-time', requireAuth, workTimeRouter(db));
  app.use('/api/meeting-notes', requireAuth, meetingNotesRouter(db));
  app.use('/api/meeting-attachments', requireAuth, meetingAttachmentsRouter(db));
  app.use('/api/audit-logs', requireAuth, requireAdmin, auditLogsRouter(db));
  app.use('/api/reports', requireAuth, requireAdmin, reportsRouter(db));
  const PORT = Number(process.env.PORT) || 4000;

  app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
  });
}

startServer();
