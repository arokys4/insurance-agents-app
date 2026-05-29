const express = require('express');
const bcrypt = require('bcryptjs');

function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'Hasło musi mieć co najmniej 8 znaków.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Hasło musi zawierać co najmniej jedną małą literę.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Hasło musi zawierać co najmniej jedną wielką literę.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Hasło musi zawierać co najmniej jedną cyfrę.';
  }

  if (!/[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Hasło musi zawierać co najmniej jeden znak specjalny.';
  }

  return null;
}

function formatName(value) {
  return value
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function validateAgentData(data, options = { requirePassword: false }) {
  const firstName = (data.firstName || '').trim();
  const lastName = (data.lastName || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const phone = (data.phone || '').trim();
  const status = data.status || 'Aktywny';
  const password = data.password || '';

  if (!firstName || !lastName || !email || !phone || !status) {
    return {
      valid: false,
      error: 'Uzupełnij wszystkie wymagane pola.'
    };
  }

  const nameRegex = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/;

  if (!nameRegex.test(firstName)) {
    return {
      valid: false,
      error: 'Imię może zawierać tylko litery.'
    };
  }

  if (!nameRegex.test(lastName)) {
    return {
      valid: false,
      error: 'Nazwisko może zawierać tylko litery.'
    };
  }

  if (!email.includes('@')) {
    return {
      valid: false,
      error: 'Podaj poprawny adres e-mail.'
    };
  }

  const phoneRegex = /^[0-9]{9}$/;

  if (!phoneRegex.test(phone)) {
    return {
      valid: false,
      error: 'Telefon musi składać się dokładnie z 9 cyfr.'
    };
  }

  if (status !== 'Aktywny' && status !== 'Nieaktywny') {
    return {
      valid: false,
      error: 'Nieprawidłowy status agenta.'
    };
  }

  if (options.requirePassword && !password) {
    return {
      valid: false,
      error: 'Podaj hasło startowe dla agenta.'
    };
  }

  if (password) {
    const passwordError = validatePasswordStrength(password);

    if (passwordError) {
      return {
        valid: false,
        error: passwordError
      };
    }
  }

  return {
    valid: true,
    agent: {
      firstName: formatName(firstName),
      lastName: formatName(lastName),
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
        ORDER BY
          CASE WHEN status = 'Aktywny' THEN 0 ELSE 1 END,
          last_name ASC,
          first_name ASC
      `);

      res.json(agents.map(agent => ({
        ...agent,
        mustChangePassword: Boolean(agent.mustChangePassword)
      })));
    } catch (error) {
      console.error('Błąd pobierania agentów:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać listy agentów.'
      });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await db.get(
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

      if (!agent) {
        return res.status(404).json({
          error: 'Nie znaleziono agenta.'
        });
      }

      res.json({
        ...agent,
        mustChangePassword: Boolean(agent.mustChangePassword)
      });
    } catch (error) {
      console.error('Błąd pobierania agenta:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać danych agenta.'
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validation = validateAgentData(req.body, {
        requirePassword: true
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        status,
        password
      } = validation.agent;

      const existingAgent = await db.get(
        `
        SELECT id
        FROM agents
        WHERE email = ?
        `,
        [email]
      );

      if (existingAgent) {
        return res.status(409).json({
          error: 'Agent z takim adresem e-mail już istnieje.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.run(
        `
        INSERT INTO agents (
          first_name,
          last_name,
          email,
          phone,
          status,
          role,
          password,
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
          'AGENT',
          hashedPassword,
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

      res.status(201).json({
        ...createdAgent,
        mustChangePassword: Boolean(createdAgent.mustChangePassword)
      });
    } catch (error) {
      console.error('Błąd dodawania agenta:', error);

      res.status(500).json({
        error: 'Nie udało się dodać agenta.'
      });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const validation = validateAgentData(req.body, {
        requirePassword: false
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const agentExists = await db.get(
        `
        SELECT id, role
        FROM agents
        WHERE id = ?
        `,
        [id]
      );

      if (!agentExists) {
        return res.status(404).json({
          error: 'Nie znaleziono agenta.'
        });
      }

      if (agentExists.role === 'ADMIN') {
        return res.status(403).json({
          error: 'Nie można edytować konta administratora w module agentów.'
        });
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        status,
        password
      } = validation.agent;

      const emailOwner = await db.get(
        `
        SELECT id
        FROM agents
        WHERE email = ? AND id != ?
        `,
        [email, id]
      );

      if (emailOwner) {
        return res.status(409).json({
          error: 'Inny agent używa już tego adresu e-mail.'
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
            must_change_password = 1
          WHERE id = ?
          `,
          [
            firstName,
            lastName,
            email,
            phone,
            status,
            hashedPassword,
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
          [
            firstName,
            lastName,
            email,
            phone,
            status,
            id
          ]
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

      res.json({
        ...updatedAgent,
        mustChangePassword: Boolean(updatedAgent.mustChangePassword)
      });
    } catch (error) {
      console.error('Błąd edycji agenta:', error);

      res.status(500).json({
        error: 'Nie udało się zaktualizować agenta.'
      });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await db.get(
        `
        SELECT id, first_name AS firstName, last_name AS lastName, role
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

      const assignedMeetings = await db.get(
        `
        SELECT COUNT(*) AS count
        FROM meetings
        WHERE agent_id = ?
        `,
        [id]
      );

      if (assignedMeetings.count > 0) {
        return res.status(409).json({
          error: 'Nie można usunąć agenta, który ma przypisane spotkania.'
        });
      }

      const workTimeEntries = await db.get(
        `
        SELECT COUNT(*) AS count
        FROM work_time_entries
        WHERE agent_id = ?
        `,
        [id]
      );

      if (workTimeEntries.count > 0) {
        return res.status(409).json({
          error: 'Nie można usunąć agenta, który ma wpisy czasu pracy.'
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
        message: `Agent ${agent.firstName} ${agent.lastName} został usunięty.`
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