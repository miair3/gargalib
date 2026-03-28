import express from "express";
import pool from "../db.js";

const router = express.Router();
const MAX_MESSAGE_LENGTH = 4096;

const dialogSelect = `
  SELECT
    id,
    sender_id AS "senderId",
    receiver_id AS "receiverId",
    text,
    original_text AS "originalText",
    is_read AS "read",
    is_deleted AS "deleted",
    is_edited AS "edited",
    deleted_at AS "deletedAt",
    deleted_by AS "deletedBy",
    created_at AS "createdAt"
  FROM messages
`;

router.get("/can-chat/:currentUserId/:targetUserId", async (req, res) => {
  const { currentUserId, targetUserId } = req.params;

  try {
    const follow = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2",
      [currentUserId, targetUserId]
    );

    res.json({ canChat: follow.rows.length > 0 });
  } catch (err) {
    console.log("CAN CHAT ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

router.get("/:currentUserId/:targetUserId", async (req, res) => {
  const { currentUserId, targetUserId } = req.params;

  try {
    await pool.query(
      `
      UPDATE messages
      SET is_read = TRUE
      WHERE receiver_id = $1
        AND sender_id = $2
        AND is_read = FALSE
      `,
      [currentUserId, targetUserId]
    );

    const result = await pool.query(
      `
      ${dialogSelect}
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
      `,
      [currentUserId, targetUserId]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET MESSAGES ERROR:", err);
    res.status(500).json({ error: "Ошибка" });
  }
});

router.post("/", async (req, res) => {
  const { senderId, receiverId, text } = req.body;

  try {
    const safeSenderId = Number(senderId);
    const safeReceiverId = Number(receiverId);
    const normalizedText = String(text || "").trim();

    if (!safeSenderId || !safeReceiverId || !normalizedText) {
      return res.status(400).json({ message: "Нет данных для отправки" });
    }

    if ([...normalizedText].length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Сообщение не должно превышать ${MAX_MESSAGE_LENGTH} символов`,
      });
    }

    const follow = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2",
      [safeSenderId, safeReceiverId]
    );

    if (follow.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "Сначала подпишитесь на пользователя" });
    }

    const result = await pool.query(
      `
      INSERT INTO messages (
        sender_id,
        receiver_id,
        text,
        original_text
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        sender_id AS "senderId",
        receiver_id AS "receiverId",
        text,
        original_text AS "originalText",
        is_read AS "read",
        is_deleted AS "deleted",
        is_edited AS "edited",
        deleted_at AS "deletedAt",
        deleted_by AS "deletedBy",
        created_at AS "createdAt"
      `,
      [safeSenderId, safeReceiverId, normalizedText, normalizedText]
    );

    const senderUser = await pool.query(
      "SELECT username FROM users WHERE id=$1",
      [safeSenderId]
    );

    const senderName = senderUser.rows[0]?.username || "Пользователь";

    await pool.query(
      `
      INSERT INTO notifications (user_id, from_user_id, type, text)
      VALUES ($1, $2, $3, $4)
      `,
      [safeReceiverId, safeSenderId, "message", `${senderName} отправил вам сообщение`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.log("SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: "Ошибка отправки" });
  }
});

router.put("/:messageId/edit", async (req, res) => {
  const { messageId } = req.params;
  const { userId, text } = req.body;

  try {
    const safeUserId = Number(userId);
    const normalizedText = String(text || "").trim();

    if (!safeUserId || !normalizedText) {
      return res.status(400).json({ message: "Нет данных" });
    }

    if ([...normalizedText].length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Сообщение не должно превышать ${MAX_MESSAGE_LENGTH} символов`,
      });
    }

    const check = await pool.query(
      "SELECT sender_id, is_deleted FROM messages WHERE id=$1",
      [messageId]
    );

    if (!check.rows.length) {
      return res.status(404).json({ message: "Сообщение не найдено" });
    }

    const message = check.rows[0];

    if (String(message.sender_id) !== String(safeUserId)) {
      return res.status(403).json({ message: "Нет доступа" });
    }

    if (message.is_deleted) {
      return res
        .status(400)
        .json({ message: "Удалённое сообщение нельзя изменить" });
    }

    const result = await pool.query(
      `
      UPDATE messages
      SET
        text = $1,
        original_text = $1,
        is_edited = TRUE
      WHERE id = $2
      RETURNING
        id,
        sender_id AS "senderId",
        receiver_id AS "receiverId",
        text,
        original_text AS "originalText",
        is_read AS "read",
        is_deleted AS "deleted",
        is_edited AS "edited",
        deleted_at AS "deletedAt",
        deleted_by AS "deletedBy",
        created_at AS "createdAt"
      `,
      [normalizedText, messageId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("EDIT MESSAGE ERROR:", err);
    res.status(500).json({ error: "Ошибка редактирования" });
  }
});

router.put("/:messageId/delete", async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  try {
    const safeUserId = Number(userId);

    if (!safeUserId) {
      return res.status(400).json({ message: "Нет userId" });
    }

    const userRes = await pool.query(
      "SELECT id, role FROM users WHERE id=$1",
      [safeUserId]
    );

    const msgRes = await pool.query(
      "SELECT sender_id FROM messages WHERE id=$1",
      [messageId]
    );

    if (!userRes.rows.length || !msgRes.rows.length) {
      return res.status(404).json({ message: "Данные не найдены" });
    }

    const user = userRes.rows[0];
    const msg = msgRes.rows[0];

    const canDelete =
      String(msg.sender_id) === String(user.id) || user.role === "owner";

    if (!canDelete) {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const result = await pool.query(
      `
      UPDATE messages
      SET
        text = 'Сообщение удалено',
        is_deleted = TRUE,
        deleted_at = NOW(),
        deleted_by = $1
      WHERE id = $2
      RETURNING
        id,
        sender_id AS "senderId",
        receiver_id AS "receiverId",
        text,
        original_text AS "originalText",
        is_read AS "read",
        is_deleted AS "deleted",
        is_edited AS "edited",
        deleted_at AS "deletedAt",
        deleted_by AS "deletedBy",
        created_at AS "createdAt"
      `,
      [safeUserId, messageId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("DELETE MESSAGE ERROR:", err);
    res.status(500).json({ error: "Ошибка удаления сообщения" });
  }
});

router.put("/:messageId/restore", async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  try {
    const safeUserId = Number(userId);

    if (!safeUserId) {
      return res.status(400).json({ message: "Нет userId" });
    }

    const userRes = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [safeUserId]
    );

    if (!userRes.rows.length || userRes.rows[0].role !== "owner") {
      return res
        .status(403)
        .json({ message: "Только owner может восстановить" });
    }

    const result = await pool.query(
      `
      UPDATE messages
      SET
        text = COALESCE(NULLIF(original_text, ''), 'Восстановленное сообщение'),
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL
      WHERE id = $1
      RETURNING
        id,
        sender_id AS "senderId",
        receiver_id AS "receiverId",
        text,
        original_text AS "originalText",
        is_read AS "read",
        is_deleted AS "deleted",
        is_edited AS "edited",
        deleted_at AS "deletedAt",
        deleted_by AS "deletedBy",
        created_at AS "createdAt"
      `,
      [messageId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Сообщение не найдено" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log("RESTORE MESSAGE ERROR:", err);
    res.status(500).json({ error: "Ошибка восстановления сообщения" });
  }
});

router.delete("/dialog/:currentUserId/:targetUserId", async (req, res) => {
  const { currentUserId, targetUserId } = req.params;

  try {
    await pool.query(
      `
      DELETE FROM messages
      WHERE (sender_id=$1 AND receiver_id=$2)
         OR (sender_id=$2 AND receiver_id=$1)
      `,
      [currentUserId, targetUserId]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("DELETE DIALOG ERROR:", err);
    res.status(500).json({ error: "Ошибка очистки чата" });
  }
});

export default router;