import express from "express";
import pool from "../db.js";

const router = express.Router();

//
// 🔔 Все уведомления пользователя
//
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC",
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Ошибка" });
  }
});

//
// ✅ Прочитать уведомление
//
router.put("/read/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "UPDATE notifications SET is_read=true WHERE id=$1",
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Ошибка" });
  }
});

export default router;