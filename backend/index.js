const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend działa'
  });
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});