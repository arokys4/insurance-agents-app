const express = require('express');
const bcrypt = require('bcryptjs');
const { createAuthToken, requireAuth } = require('../utils/auth');
const { addAuditLog } = require('../utils/audit');

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

function validateProfileData(data) {
  const firstName = (data.firstName || '').trim();
  const lastName = (data.lastName || '').trim();
  const phone = (data.phone || '').trim();
  const nameRegex = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s-]+$/;
  const phoneRegex = /^[0-9]{9}$/;

  if (!firstName || !lastName || !phone) {
    return {
      valid: false,
      error: 'Uzupełnij imię, nazwisko i telefon.'
    };
  }

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

  if (!phoneRegex.test(phone)) {
    return {
      valid: false,
      error: 'Telefon musi składać się dokładnie z 9 cyfr.'
    };
  }

  return {
    valid: true,
    profile: {
      firstName,
      lastName,
      phone
    }
  };
}

function authRouter(db) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = req.body.password || '';

      if (!email || !password) {
        return res.status(400).json({
          error: 'Podaj adres e-mail i hasło.'
        });
      }

      const user = await db.get(
        `
        SELECT
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          password,
          role,
          must_change_password AS mustChangePassword,
          status
        FROM agents
        WHERE email = ?
        `,
        [email]
      );

      if (!user) {
        return res.status(401).json({
          error: 'Nieprawidłowy adres e-mail lub hasło.'
        });
      }

      if (user.status !== 'Aktywny') {
        return res.status(403).json({
          error: 'Konto użytkownika jest nieaktywne.'
        });
      }

      if (!user.password) {
        return res.status(401).json({
          error: 'Konto nie posiada ustawionego hasła.'
        });
      }

      const passwordMatches = await bcrypt.compare(password, user.password);

      if (!passwordMatches) {
        return res.status(401).json({
          error: 'Nieprawidłowy adres e-mail lub hasło.'
        });
      }

      const responseUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword)
      };

      res.json({
        token: createAuthToken(responseUser),
        user: responseUser
      });
    } catch (error) {
      console.error('Błąd logowania:', error);

      res.status(500).json({
        error: 'Nie udało się zalogować użytkownika.'
      });
    }
  });

  async function changePasswordHandler(req, res) {
    try {
      const userId = req.user.id;
      const newPassword = req.body.newPassword || '';
      const confirmPassword = req.body.confirmPassword || req.body.repeatPassword || '';

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({
          error: 'Uzupełnij wszystkie pola.'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          error: 'Hasła nie są takie same.'
        });
      }

      const passwordError = validatePasswordStrength(newPassword);

      if (passwordError) {
        return res.status(400).json({
          error: passwordError
        });
      }

      const user = await db.get(
        `
        SELECT id
        FROM agents
        WHERE id = ?
        `,
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          error: 'Nie znaleziono użytkownika.'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.run(
        `
        UPDATE agents
        SET
          password = ?,
          must_change_password = 0
        WHERE id = ?
        `,
        [hashedPassword, userId]
      );

      await addAuditLog(db, {
        userId,
        userRole: req.user.role,
        action: 'CHANGE_OWN_PASSWORD',
        entityType: 'USER_PROFILE',
        entityId: userId,
        description: 'Użytkownik zmienił hasło do swojego konta.'
      });

      res.json({
        message: 'Hasło zostało zmienione.'
      });
    } catch (error) {
      console.error('Błąd zmiany hasła:', error);

      res.status(500).json({
        error: 'Nie udało się zmienić hasła.'
      });
    }
  }

  router.post('/change-password', requireAuth, changePasswordHandler);
  router.patch('/change-password', requireAuth, changePasswordHandler);

  router.get('/me', requireAuth, async (req, res) => {
    try {
      const user = await db.get(
        `
        SELECT
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          role,
          status,
          must_change_password AS mustChangePassword
        FROM agents
        WHERE id = ?
        `,
        [req.user.id]
      );

      if (!user) {
        return res.status(404).json({
          error: 'Nie znaleziono użytkownika.'
        });
      }

      res.json({
        ...user,
        mustChangePassword: Boolean(user.mustChangePassword)
      });
    } catch (error) {
      console.error('Błąd pobierania profilu:', error);

      res.status(500).json({
        error: 'Nie udało się pobrać danych konta.'
      });
    }
  });

  router.patch('/me', requireAuth, async (req, res) => {
    try {
      const validation = validateProfileData(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error
        });
      }

      const currentUser = await db.get(
        `
        SELECT
          id,
          email,
          role
        FROM agents
        WHERE id = ?
        `,
        [req.user.id]
      );

      if (!currentUser) {
        return res.status(404).json({
          error: 'Nie znaleziono użytkownika.'
        });
      }

      await db.run(
        `
        UPDATE agents
        SET
          first_name = ?,
          last_name = ?,
          phone = ?
        WHERE id = ?
        `,
        [
          validation.profile.firstName,
          validation.profile.lastName,
          validation.profile.phone,
          req.user.id
        ]
      );

      await addAuditLog(db, {
        userId: req.user.id,
        userRole: req.user.role,
        action: 'UPDATE_OWN_PROFILE',
        entityType: 'USER_PROFILE',
        entityId: req.user.id,
        description: `Użytkownik "${currentUser.email}" zaktualizował dane swojego konta.`
      });

      const updatedUser = await db.get(
        `
        SELECT
          id,
          first_name AS firstName,
          last_name AS lastName,
          email,
          phone,
          role,
          status,
          must_change_password AS mustChangePassword
        FROM agents
        WHERE id = ?
        `,
        [req.user.id]
      );

      res.json({
        ...updatedUser,
        mustChangePassword: Boolean(updatedUser.mustChangePassword)
      });
    } catch (error) {
      console.error('Błąd aktualizacji profilu:', error);

      res.status(500).json({
        error: 'Nie udało się zaktualizować danych konta.'
      });
    }
  });

  return router;
}

module.exports = authRouter;
