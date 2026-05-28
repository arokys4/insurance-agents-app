const express = require('express');
const bcrypt = require('bcryptjs');

function formatName(value) {
  const trimmedValue = value.trim().toLocaleLowerCase('pl-PL');

  if (!trimmedValue) {
    return '';
  }

  return (
    trimmedValue.charAt(0).toLocaleUpperCase('pl-PL') +
    trimmedValue.slice(1)
  );
}

function isOnlyLetters(value) {
  const lettersRegex = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+$/;
  return lettersRegex.test(value);
}

function isValidEmail(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function validateAgentData(data, requirePassword = false) {
  const firstName = formatName(data.firstName || '');
  const lastName = formatName(data.lastName || '');
  const email = (data.email || '').trim().toLowerCase();
  const phone = (data.phone || '').replace(/\D/g, '').slice(0, 9);
  const status = data.status || 'Aktywny';
  const password = data.password || '';

  if (!firstName || !lastName || !email || !phone) {
    return {
      valid: false,
      error: 'Uzupełnij wszystkie wymagane pola.'
    };
  }

  if (!isOnlyLetters(firstName)) {
    return {
      valid: false,
      error: 'Imię może zawierać tylko litery.'
    };
  }

  if (!isOnlyLetters(lastName)) {
    return {
      valid: false,
      error: 'Nazwisko może zawierać tylko litery.'
    };
  }

  if (!isValidEmail(email)) {
    return {
      valid: false,
      error: 'Adres e-mail musi mieć poprawny format, np. jan.kowalski@firma.pl.'
    };
  }

  if (phone.length !== 9) {
    return {
      valid: false,
      error: 'Numer telefonu musi składać się dokładnie z 9 cyfr.'
    };
  }

  if (status !== 'Aktywny' && status !== 'Nieaktywny') {
    return {
      valid: false,
      error: 'Nieprawidłowy status agenta.'
    };
  }

  if (requirePassword && password.length < 6) {
    return {
      valid: false,
      error: 'Hasło startowe musi mieć co najmniej 6 znaków.'
    };
  }

  if (!requirePassword && password && password.length < 6) {
    return {
      valid: false,
      error: 'Nowe hasło musi mieć co najmniej 6 znaków.'
    };
  }

  return {
    valid: true,
    agent: {
      firstName,
      lastName,
      email,
      phone,
      status,
      password
    }
  };
}

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
          status,
          role,
          must_change_password AS mustChangePassword
        FROM agents
        ORDER BY id DESC
      `);

      res.json(agents);
    } catch (error) {
      console.error('Błąd pobierania agentów:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać listy agentów.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validation = validateAgentData(req.body, true);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const { firstName, lastName, email, phone, status, password } = validation.agent;
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.run(
        `
        INSERT INTO agents (
          first_name,
          last_name,
          email,
          phone,
          status,
          password,
          role,
          must_change_password
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          firstName,
          lastName,
          email,
          phone,
          status,
          hashedPassword,
          'AGENT',
          1
        ]
      );

      const createdAgent = await db.get(
        `
        SELECT 
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          status,
          role,
          must_change_password AS mustChangePassword
        FROM agents
        WHERE id = ?
        `,
        [result.lastID]
      );

      res.status(201).json(createdAgent);
    } catch (error) {
      console.error('Błąd dodawania agenta:', error);

      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
          error: 'Agent z takim adresem e-mail już istnieje.'
        });
      }

      res.status(500).json({
        error: 'Nie udało się dodać agenta.'
      });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const validation = validateAgentData(req.body, false);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const { firstName, lastName, email, phone, status, password } = validation.agent;

      const existingAgent = await db.get(
        `
        SELECT id, role
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      if (!existingAgent) {
        return res.status(404).json({
          error: 'Nie znaleziono agenta.'
        });
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.run(
          `
          UPDATE agents
          SET
            first_name = ?,
            last_name = ?,
            email = ?,
            phone = ?,
            status = ?,
            password = ?,
            must_change_password = ?
          WHERE id = ?
          `,
          [
            firstName,
            lastName,
            email,
            phone,
            status,
            hashedPassword,
            1,
            id
          ]
        );
      } else {
        await db.run(
          `
          UPDATE agents
          SET
            first_name = ?,
            last_name = ?,
            email = ?,
            phone = ?,
            status = ?
          WHERE id = ?
          `,
          [firstName, lastName, email, phone, status, id]
        );
      }

      const updatedAgent = await db.get(
        `
        SELECT 
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          status,
          role,
          must_change_password AS mustChangePassword
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      res.json(updatedAgent);
    } catch (error) {
      console.error('Błąd edycji agenta:', error);

      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
          error: 'Agent z takim adresem e-mail już istnieje.'
        });
      }

      res.status(500).json({
        error: 'Nie udało się zaktualizować agenta.'
      });
    }
  });

  router.patch('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status !== 'Aktywny' && status !== 'Nieaktywny') {
        return res.status(400).json({
          error: 'Nieprawidłowy status agenta.'
        });
      }

      const existingAgent = await db.get(
        `
        SELECT id
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      if (!existingAgent) {
        return res.status(404).json({
          error: 'Nie znaleziono agenta.'
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
          status,
          role,
          must_change_password AS mustChangePassword
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      res.json(updatedAgent);
    } catch (error) {
      console.error('Błąd zmiany statusu agenta:', error);

      res.status(500).json({
        error: 'Nie udało się zmienić statusu agenta.'
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await db.get(
        `
        SELECT id, role
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      if (!agent) {
        return res.status(404).json({
          error: 'Nie znaleziono agenta.'
        });
      }

      if (agent.role === 'ADMIN') {
        return res.status(403).json({
          error: 'Nie można usunąć konta administratora.'
        });
      }

      await db.run(
        `
        DELETE FROM agents
        WHERE id = ?
        `,
        [id]
      );

      res.json({
        message: 'Agent został usunięty.'
      });
    } catch (error) {
      console.error('Błąd usuwania agenta:', error);

      res.status(500).json({
        error: 'Nie udało się usunąć agenta.'
      });
    }
  });

  return router;
}

module.exports = agentsRouter;