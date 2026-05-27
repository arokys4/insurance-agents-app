const express = require('express');

function agentsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const agents = await db.all(`
        SELECT 
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          status
        FROM agents
        ORDER BY id DESC
      `);

      res.json(agents);
    } catch (error) {
      res.status(500).json({
        error: 'Nie udało się pobrać listy agentów.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { firstName, lastName, email, phone, status } = req.body;

      if (!firstName || !lastName || !email || !phone) {
        return res.status(400).json({
          error: 'Uzupełnij wszystkie wymagane pola.'
        });
      }

      const result = await db.run(
        `
        INSERT INTO agents (first_name, last_name, email, phone, status)
        VALUES (?, ?, ?, ?, ?)
        `,
        [firstName, lastName, email, phone, status || 'Aktywny']
      );

      const createdAgent = await db.get(
        `
        SELECT 
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          status
        FROM agents
        WHERE id = ?
        `,
        [result.lastID]
      );

      res.status(201).json(createdAgent);
    } catch (error) {
      res.status(500).json({
        error: 'Nie udało się dodać agenta.'
      });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone, status } = req.body;

      if (!firstName || !lastName || !email || !phone) {
        return res.status(400).json({
          error: 'Uzupełnij wszystkie wymagane pola.'
        });
      }

      await db.run(
        `
        UPDATE agents
        SET first_name = ?, last_name = ?, email = ?, phone = ?, status = ?
        WHERE id = ?
        `,
        [firstName, lastName, email, phone, status, id]
      );

      const updatedAgent = await db.get(
        `
        SELECT 
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          status
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      res.json(updatedAgent);
    } catch (error) {
      res.status(500).json({
        error: 'Nie udało się zaktualizować agenta.'
      });
    }
  });

  router.patch('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: 'Nie podano statusu.'
        });
      }

      await db.run(
        `
        UPDATE agents
        SET status = ?
        WHERE id = ?
        `,
        [status, id]
      );

      const updatedAgent = await db.get(
        `
        SELECT 
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          status
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      res.json(updatedAgent);
    } catch (error) {
      res.status(500).json({
        error: 'Nie udało się zmienić statusu agenta.'
      });
    }
  });

  return router;
}

module.exports = agentsRouter;