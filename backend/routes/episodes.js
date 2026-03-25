import express from "express";
import pool from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");

// создаём папку uploads если её нет
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// настройка хранения файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".mp4");
    cb(null, `episode-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

//
// ➕ ДОБАВИТЬ СЕРИЮ С ВИДЕОФАЙЛОМ
//
router.post("/", upload.single("video"), async (req, res) => {
  const { animeId, episodeNumber, userId } = req.body;

  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  try {
    const user = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (
      user.rows[0].role !== "admin" &&
      user.rows[0].role !== "owner"
    ) {
      return res.status(403).json({ message: "Нет доступа" });
    }

    if (!animeId || !episodeNumber || !req.file) {
      return res.status(400).json({ message: "Пустые данные" });
    }

    const anime = await pool.query(
      "SELECT id FROM anime WHERE id=$1",
      [parseInt(animeId, 10)]
    );

    if (!anime.rows.length) {
      return res.status(404).json({ message: "Аниме не найдено" });
    }

    const existingEpisode = await pool.query(
      "SELECT id FROM episodes WHERE anime_id=$1 AND episode_number=$2",
      [parseInt(animeId, 10), parseInt(episodeNumber, 10)]
    );

    if (existingEpisode.rows.length > 0) {
      return res.status(400).json({ message: "Такая серия уже существует" });
    }

    const videoUrl = `https://gargalib-backend.onrender.com/uploads/${req.file.filename}`;

    const result = await pool.query(
      `
      INSERT INTO episodes (anime_id, episode_number, video)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        parseInt(animeId, 10),
        parseInt(episodeNumber, 10),
        videoUrl,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("ADD EP ERROR:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

//
// 📺 ПОЛУЧИТЬ СЕРИИ
//
router.get("/:animeId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM episodes WHERE anime_id=$1 ORDER BY episode_number ASC",
      [req.params.animeId]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET EP ERROR:", err);
    res.status(500).json({ error: "Ошибка получения" });
  }
});

//
// 🗑️ УДАЛИТЬ СЕРИЮ (ТОЛЬКО OWNER)
//
router.delete("/:episodeId", async (req, res) => {
  const { episodeId } = req.params;
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "Нет userId" });
    }

    const user = await pool.query(
      "SELECT id, role FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (user.rows[0].role !== "owner") {
      return res
        .status(403)
        .json({ message: "Только владелец может удалять серии" });
    }

    const episode = await pool.query(
      "SELECT * FROM episodes WHERE id=$1",
      [episodeId]
    );

    if (!episode.rows.length) {
      return res.status(404).json({ message: "Серия не найдена" });
    }

    const episodeData = episode.rows[0];

    await pool.query("DELETE FROM episodes WHERE id=$1", [episodeId]);

    if (episodeData.video) {
      try {
        const fileName = episodeData.video.split("/uploads/")[1];

        if (fileName) {
          const filePath = path.join(uploadDir, fileName);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (fileErr) {
        console.log("DELETE VIDEO FILE ERROR:", fileErr);
      }
    }

    res.json({ success: true, message: "Серия удалена" });
  } catch (err) {
    console.log("DELETE EP ERROR:", err);
    res.status(500).json({ error: "Ошибка удаления серии" });
  }
});

export default router;