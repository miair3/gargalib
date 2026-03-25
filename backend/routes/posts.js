import express from "express";
import pool from "../db.js";

const router = express.Router();

const normalizeUser = (row) => {
  if (!row) return null;

  return {
    ...row,
    isBanned: Boolean(row.banned_until),
    banUntil: row.banned_until || null,
    banReason: row.ban_reason || "",
  };
};

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const safeUsername = String(username || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "").trim();

    if (!safeUsername || !safeEmail || !safePassword) {
      return res.status(400).json({ message: "Заполните все поля" });
    }

    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [safeEmail]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: "Пользователь уже есть" });
    }

    const result = await pool.query(
      `
      INSERT INTO users (username, email, password, role, is_online, last_seen)
      VALUES ($1, $2, $3, 'user', false, NULL)
      RETURNING
        id,
        username,
        email,
        role,
        avatar,
        is_online,
        banned_until,
        ban_reason,
        last_seen
      `,
      [safeUsername, safeEmail, safePassword]
    );

    return res.status(201).json({
      success: true,
      user: normalizeUser(result.rows[0]),
      message: "Регистрация успешна",
    });
  } catch (err) {
    console.log("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const safeEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "").trim();

    if (!safeEmail || !safePassword) {
      return res.status(400).json({ message: "Введите email и пароль" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [safeEmail, safePassword]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Неверные данные" });
    }

    const foundUser = result.rows[0];

    await pool.query(
      `
      UPDATE users
      SET is_online = true,
          last_seen = NOW()
      WHERE id = $1
      `,
      [foundUser.id]
    );

    const updatedUser = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        role,
        avatar,
        is_online,
        banned_until,
        ban_reason,
        last_seen
      FROM users
      WHERE id = $1
      `,
      [foundUser.id]
    );

    const token =
      Math.random().toString(36).substring(2) +
      Date.now().toString(36);

    return res.status(200).json({
      success: true,
      token,
      user: normalizeUser(updatedUser.rows[0]),
    });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.get("/user/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        role,
        avatar,
        is_online,
        banned_until,
        ban_reason,
        last_seen
      FROM users
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json(normalizeUser(result.rows[0]));
  } catch (err) {
    console.log("GET USER ERROR:", err);
    return res.status(500).json({ message: "Ошибка получения" });
  }
});

router.put("/update-profile", async (req, res) => {
  const { id, username, avatar } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE users
      SET username = $1, avatar = $2
      WHERE id = $3
      RETURNING
        id,
        username,
        email,
        role,
        avatar,
        is_online,
        banned_until,
        ban_reason,
        last_seen
      `,
      [username, avatar, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json(normalizeUser(result.rows[0]));
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ message: "Ошибка обновления" });
  }
});

router.put("/make-admin", async (req, res) => {
  const { id, ownerId } = req.body;

  try {
    const owner = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [ownerId]
    );

    if (owner.rows[0]?.role !== "owner") {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET role = 'admin'
      WHERE id = $1
      RETURNING
        id,
        username,
        email,
        role,
        avatar,
        is_online,
        banned_until,
        ban_reason,
        last_seen
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json(normalizeUser(result.rows[0]));
  } catch (err) {
    console.log("MAKE ADMIN ERROR:", err);
    return res.status(500).json({ message: "Ошибка назначения" });
  }
});

router.put("/remove-admin", async (req, res) => {
  const { id, ownerId } = req.body;

  try {
    const owner = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [ownerId]
    );

    if (owner.rows[0]?.role !== "owner") {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET role = 'user'
      WHERE id = $1
      RETURNING
        id,
        username,
        email,
        role,
        avatar,
        is_online,
        banned_until,
        ban_reason,
        last_seen
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    return res.json(normalizeUser(result.rows[0]));
  } catch (err) {
    console.log("REMOVE ADMIN ERROR:", err);
    return res.status(500).json({ message: "Ошибка" });
  }
});

export default router;