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

      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          mustChangePassword: Boolean(user.mustChangePassword)
        }
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
      const userId = Number(req.body.userId);
      const newPassword = req.body.newPassword || '';
      const confirmPassword = req.body.confirmPassword || req.body.repeatPassword || '';

      if (!userId || !newPassword || !confirmPassword) {
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

  router.post('/change-password', changePasswordHandler);
  router.patch('/change-password', changePasswordHandler);

  return router;
}

module.exports = authRouter;