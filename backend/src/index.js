const express = require('express');
const cors = require('cors');
const { openDatabase } = require('./db/database');
const agentsRouter = require('./routes/agents.routes');

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

  const PORT = 4000;

  app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
  });
}

startServer();