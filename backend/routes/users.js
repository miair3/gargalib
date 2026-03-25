import express from "express";
import pool from "../db.js";

const router = express.Router();

const ONLINE_WINDOW_SECONDS = 20;
const MAX_AVATAR_LENGTH = 2_000_000;

const normalizeUserRow = (row) => {
  if (!row) return row;

  let isOnline = false;

  if (row.last_seen) {
    const lastSeenTime = new Date(row.last_seen).getTime();
    if (!Number.isNaN(lastSeenTime)) {
      isOnline = Date.now() - lastSeenTime < ONLINE_WINDOW_SECONDS * 1000;
    }
  }

  return {
    ...row,
    is_online: isOnline,
  };
};

const sanitizeAvatar = (avatar) => {
  if (!avatar) return "";

  const safeAvatar = String(avatar).trim();

  if (!safeAvatar) return "";

  const isBase64Image =
    safeAvatar.startsWith("data:image/jpeg;base64,") ||
    safeAvatar.startsWith("data:image/jpg;base64,") ||
    safeAvatar.startsWith("data:image/png;base64,") ||
    safeAvatar.startsWith("data:image/webp;base64,");

  const isHttpUrl =
    safeAvatar.startsWith("http://") || safeAvatar.startsWith("https://");

  if (!isBase64Image && !isHttpUrl) {
    return "";
  }

  if (safeAvatar.length > MAX_AVATAR_LENGTH) {
    return null;
  }

  return safeAvatar;
};

//
// 👥 ВСЕ ПОЛЬЗОВАТЕЛИ
//
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        role,
        avatar,
        banned_until,
        ban_reason,
        banned_by,
        last_seen
      FROM users
      ORDER BY id ASC
      `
    );

    res.json(result.rows.map(normalizeUserRow));
  } catch (err) {
    console.log("GET USERS ERROR:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

//
// 🔎 ПРОВЕРИТЬ ПОДПИСКУ
//
router.get("/follow-status/:followerId/:followingId", async (req, res) => {
  const { followerId, followingId } = req.params;

  try {
    const result = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2",
      [followerId, followingId]
    );

    res.json({ following: result.rows.length > 0 });
  } catch (err) {
    console.log("FOLLOW STATUS ERROR:", err);
    res.status(500).json({ error: "Ошибка проверки подписки" });
  }
});

//
// ❤️ ПОЛУЧИТЬ ИЗБРАННОЕ ПОЛЬЗОВАТЕЛЯ
//
router.get("/:id/favorites", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT a.*
      FROM user_favorites uf
      JOIN anime a ON a.id = uf.anime_id
      WHERE uf.user_id = $1
      ORDER BY uf.id DESC
      `,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET FAVORITES ERROR:", err);
    res.status(500).json({ error: "Ошибка получения избранного" });
  }
});

//
// ❤️ СИНХРОНИЗАЦИЯ ИЗБРАННОГО В БД
//
router.post("/favorites/sync", async (req, res) => {
  const { userId, animeIds } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "Нет userId" });
    }

    await pool.query("DELETE FROM user_favorites WHERE user_id=$1", [userId]);

    for (const animeId of animeIds || []) {
      await pool.query(
        "INSERT INTO user_favorites (user_id, anime_id) VALUES ($1, $2) ON CONFLICT (user_id, anime_id) DO NOTHING",
        [userId, animeId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.log("SYNC FAVORITES ERROR:", err);
    res.status(500).json({ error: "Ошибка синхронизации избранного" });
  }
});

//
// ✏️ ОБНОВИТЬ ПРОФИЛЬ
//
router.put("/update", async (req, res) => {
  const { userId, username, avatar } = req.body;

  try {
    const safeUserId = Number(userId);
    const safeUsername = String(username || "").trim();
    const safeAvatar = sanitizeAvatar(avatar);

    if (!safeUserId) {
      return res.status(400).json({ message: "Нет userId" });
    }

    if (!safeUsername) {
      return res.status(400).json({ message: "Введите имя пользователя" });
    }

    if (safeUsername.length > 30) {
      return res.status(400).json({ message: "Имя слишком длинное" });
    }

    if (safeAvatar === null) {
      return res.status(413).json({
        message: "Аватар слишком большой. Выберите изображение меньше.",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET username = $1,
          avatar = $2
      WHERE id = $3
      RETURNING
        id,
        username,
        email,
        role,
        avatar,
        banned_until,
        ban_reason,
        banned_by,
        last_seen
      `,
      [safeUsername, safeAvatar, safeUserId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json({
      success: true,
      user: normalizeUserRow(result.rows[0]),
    });
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

//
// ⭐ СДЕЛАТЬ АДМИНОМ
//
router.put("/make-admin-email", async (req, res) => {
  const { email, ownerId } = req.body;

  try {
    const owner = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [ownerId]
    );

    if (!owner.rows.length || owner.rows[0].role !== "owner") {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const updated = await pool.query(
      "UPDATE users SET role='admin' WHERE email=$1 RETURNING id",
      [email]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json({ success: true });
  } catch (err) {
    console.log("MAKE ADMIN ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

//
// ➖ УБРАТЬ АДМИНА
//
router.put("/remove-admin", async (req, res) => {
  const { id, ownerId } = req.body;

  try {
    const owner = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [ownerId]
    );

    if (!owner.rows.length || owner.rows[0].role !== "owner") {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const updated = await pool.query(
      "UPDATE users SET role='user' WHERE id=$1 RETURNING id",
      [id]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json({ success: true });
  } catch (err) {
    console.log("REMOVE ADMIN ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

//
// 🔨 ЗАБАНИТЬ ПОЛЬЗОВАТЕЛЯ
//
router.put("/ban", async (req, res) => {
  const { adminId, targetUserId, durationHours, reason } = req.body;

  try {
    const admin = await pool.query(
      "SELECT id, role FROM users WHERE id=$1",
      [adminId]
    );

    const target = await pool.query(
      "SELECT id, role FROM users WHERE id=$1",
      [targetUserId]
    );

    if (!admin.rows.length || !target.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const adminRole = admin.rows[0].role;
    const targetRole = target.rows[0].role;

    if (String(adminId) === String(targetUserId)) {
      return res.status(400).json({ message: "Себя банить нельзя" });
    }

    if (adminRole === "owner") {
      if (targetRole === "owner") {
        return res.status(403).json({ message: "Владельца банить нельзя" });
      }
    } else if (adminRole === "admin") {
      if (targetRole === "admin" || targetRole === "owner") {
        return res.status(403).json({
          message: "Админ может банить только обычных пользователей",
        });
      }
    } else {
      return res.status(403).json({ message: "Нет доступа" });
    }

    await pool.query(
      `
      UPDATE users
      SET banned_until = NOW() + ($1 || ' hours')::interval,
          ban_reason = $2,
          banned_by = $3
      WHERE id = $4
      `,
      [durationHours, reason || "Без причины", adminId, targetUserId]
    );

    res.json({ success: true, message: "Пользователь забанен" });
  } catch (err) {
    console.log("BAN ERROR:", err);
    res.status(500).json({ error: "Ошибка бана" });
  }
});

//
// ✅ РАЗБАНИТЬ ПОЛЬЗОВАТЕЛЯ
//
router.put("/unban", async (req, res) => {
  const { adminId, targetUserId } = req.body;

  try {
    const admin = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [adminId]
    );

    const target = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [targetUserId]
    );

    if (!admin.rows.length || !target.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const adminRole = admin.rows[0].role;
    const targetRole = target.rows[0].role;

    if (adminRole === "owner") {
      if (targetRole === "owner") {
        return res.status(403).json({
          message: "Владельца разбанить нельзя таким способом",
        });
      }
    } else if (adminRole === "admin") {
      if (targetRole === "admin" || targetRole === "owner") {
        return res.status(403).json({
          message: "Админ может разбанить только обычных пользователей",
        });
      }
    } else {
      return res.status(403).json({ message: "Нет доступа" });
    }

    await pool.query(
      `
      UPDATE users
      SET banned_until = NULL,
          ban_reason = NULL,
          banned_by = NULL
      WHERE id = $1
      `,
      [targetUserId]
    );

    res.json({ success: true, message: "Пользователь разбанен" });
  } catch (err) {
    console.log("UNBAN ERROR:", err);
    res.status(500).json({ error: "Ошибка разбана" });
  }
});

//
// ❤️ ПОДПИСКА + 🔔 УВЕДОМЛЕНИЕ
//
router.post("/follow", async (req, res) => {
  const { followerId, followingId } = req.body;

  try {
    if (!followerId || !followingId) {
      return res.status(400).json({ message: "Нет данных" });
    }

    if (String(followerId) === String(followingId)) {
      return res.status(400).json({ message: "Нельзя подписаться на себя" });
    }

    const existing = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2",
      [followerId, followingId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "DELETE FROM follows WHERE follower_id=$1 AND following_id=$2",
        [followerId, followingId]
      );

      return res.json({ following: false });
    }

    await pool.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1,$2)",
      [followerId, followingId]
    );

    const followerUser = await pool.query(
      "SELECT username FROM users WHERE id=$1",
      [followerId]
    );

    const followerName = followerUser.rows[0]?.username || "Пользователь";

    await pool.query(
      `INSERT INTO notifications (user_id, from_user_id, type, text)
       VALUES ($1, $2, $3, $4)`,
      [
        followingId,
        followerId,
        "follow",
        `${followerName} подписался на вас`,
      ]
    );

    res.json({ following: true });
  } catch (err) {
    console.log("FOLLOW ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

//
// 🟢 ONLINE
//
router.put("/online", async (req, res) => {
  const { userId } = req.body;

  try {
    await pool.query(
      `
      UPDATE users
      SET is_online = true,
          last_seen = NOW()
      WHERE id=$1
      `,
      [userId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.log("ONLINE ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

//
// 🔴 OFFLINE
//
router.put("/offline", async (req, res) => {
  const { userId } = req.body;

  try {
    await pool.query(
      `
      UPDATE users
      SET is_online = false,
          last_seen = NOW() - interval '1 minute'
      WHERE id=$1
      `,
      [userId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.log("OFFLINE ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

//
// 👤 ОДИН ПОЛЬЗОВАТЕЛЬ
//
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        avatar,
        role,
        banned_until,
        ban_reason,
        banned_by,
        last_seen
      FROM users
      WHERE id=$1
      `,
      [id]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const followersCount = await pool.query(
      "SELECT COUNT(*) FROM follows WHERE following_id=$1",
      [id]
    );

    const followingCount = await pool.query(
      "SELECT COUNT(*) FROM follows WHERE follower_id=$1",
      [id]
    );

    const followersUsers = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.avatar,
        u.role,
        u.banned_until,
        u.ban_reason,
        u.banned_by,
        u.last_seen
      FROM follows f
      JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = $1
      ORDER BY f.id DESC
      `,
      [id]
    );

    const followingUsers = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.avatar,
        u.role,
        u.banned_until,
        u.ban_reason,
        u.banned_by,
        u.last_seen
      FROM follows f
      JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = $1
      ORDER BY f.id DESC
      `,
      [id]
    );

    const preparedUser = normalizeUserRow(user.rows[0]);

    res.json({
      ...preparedUser,
      followers: Number(followersCount.rows[0].count),
      following: Number(followingCount.rows[0].count),
      followersUsers: followersUsers.rows.map(normalizeUserRow),
      followingUsers: followingUsers.rows.map(normalizeUserRow),
    });
  } catch (err) {
    console.log("GET USER ERROR:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

//
// ❌ УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ
//
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "DELETE FROM follows WHERE follower_id=$1 OR following_id=$1",
      [id]
    );

    await pool.query(
      "DELETE FROM notifications WHERE user_id=$1 OR from_user_id=$1",
      [id]
    );

    await pool.query(
      "DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1",
      [id]
    );

    await pool.query(
      "DELETE FROM user_favorites WHERE user_id=$1",
      [id]
    );

    await pool.query(
      "DELETE FROM users WHERE id=$1",
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("DELETE USER ERROR:", err);
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

export default router;