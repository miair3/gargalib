import express from "express";
import pool from "../db.js";

const router = express.Router();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cache = new Map();

const CACHE_TTL = {
  search: 1000 * 60 * 10,
  anime: 1000 * 60 * 30,
  home: 1000 * 60 * 15,
};

const getCache = (key) => {
  const item = cache.get(key);

  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.data;
};

const setCache = (key, data, ttl) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
};

const fetchJson = async (url, retries = 4, fallbackCacheKey = null) => {
  const cached = fallbackCacheKey ? getCache(fallbackCacheKey) : null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("retry-after");
          const retryAfterMs = retryAfterHeader
            ? Number(retryAfterHeader) * 1000
            : 1800 * (attempt + 1);

          if (attempt < retries) {
            await sleep(retryAfterMs);
            continue;
          }

          if (cached) {
            return cached;
          }

          throw new Error(
            data?.message ||
              "Jikan временно ограничил запросы. Попробуйте чуть позже."
          );
        }

        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      if (fallbackCacheKey) {
        setCache(
          fallbackCacheKey,
          data,
          fallbackCacheKey.startsWith("search:")
            ? CACHE_TTL.search
            : fallbackCacheKey.startsWith("anime:")
            ? CACHE_TTL.anime
            : CACHE_TTL.home
        );
      }

      return data;
    } catch (err) {
      if (attempt === retries) {
        if (cached) {
          return cached;
        }
        throw err;
      }

      await sleep(900 * (attempt + 1));
    }
  }
};

const mapJikanAnime = (anime) => ({
  id: anime.mal_id,
  title: anime.title || "",
  genre: Array.isArray(anime.genres)
    ? anime.genres.map((g) => g.name).join(", ")
    : "",
  episodes: anime.episodes || 0,
  description: anime.synopsis || "",
  year: anime.year || anime.aired?.prop?.from?.year || null,
  image:
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    "",
  banner:
    anime.trailer?.images?.maximum_image_url ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    "",
  type: anime.type || "",
  score: anime.score || null,
  status: anime.status || "",
  source: "jikan",
});

const uniqueAnimeList = (list) => {
  const seen = new Set();

  return list.filter((anime) => {
    if (!anime?.id) return false;
    if (seen.has(anime.id)) return false;
    seen.add(anime.id);
    return true;
  });
};

router.get("/home-feed", async (req, res) => {
  try {
    const cacheKey = "home-feed";
    const cached = getCache(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const popularCollected = [];
    const popularPages = [1, 2];

    for (const page of popularPages) {
      const data = await fetchJson(
        `https://api.jikan.moe/v4/top/anime?page=${page}&limit=20`,
        4,
        cacheKey
      );

      if (Array.isArray(data?.data)) {
        popularCollected.push(...data.data);
      }

      await sleep(500);
    }

    const currentYear = new Date().getFullYear();
    const seasonTargets = [
      { year: currentYear, season: "winter" },
      { year: currentYear, season: "spring" },
      { year: currentYear, season: "summer" },
      { year: currentYear, season: "fall" },
      { year: currentYear - 1, season: "winter" },
      { year: currentYear - 1, season: "spring" },
      { year: currentYear - 1, season: "summer" },
      { year: currentYear - 1, season: "fall" },
    ];

    const newCollected = [];

    for (const item of seasonTargets) {
      try {
        const seasonKey = `season:${item.year}:${item.season}`;
        const data = await fetchJson(
          `https://api.jikan.moe/v4/seasons/${item.year}/${item.season}?limit=20`,
          4,
          seasonKey
        );

        if (Array.isArray(data?.data)) {
          newCollected.push(...data.data);
        }
      } catch (err) {
        console.log(
          `SEASON LOAD ERROR: ${item.year} ${item.season}:`,
          err.message
        );
      }

      await sleep(500);
    }

    const popularAnime = uniqueAnimeList(
      popularCollected.map(mapJikanAnime)
    ).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

    const newAnime = uniqueAnimeList(
      newCollected
        .sort((a, b) => {
          const aDate = new Date(a.aired?.from || 0).getTime();
          const bDate = new Date(b.aired?.from || 0).getTime();
          return bDate - aDate;
        })
        .map(mapJikanAnime)
    );

    const payload = {
      popularAnime,
      newAnime,
    };

    setCache(cacheKey, payload, CACHE_TTL.home);

    res.json(payload);
  } catch (err) {
    console.log("HOME FEED ERROR:", err);
    res.status(500).json({ message: "Ошибка загрузки home-feed" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({ message: "Введите запрос" });
    }

    const normalizedQuery = q.toLowerCase();
    const cacheKey = `search:${normalizedQuery}`;
    const cached = getCache(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const data = await fetchJson(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=10&order_by=score&sort=desc`,
      4,
      cacheKey
    );

    const animeList = Array.isArray(data?.data)
      ? data.data.map(mapJikanAnime)
      : [];

    setCache(cacheKey, animeList, CACHE_TTL.search);

    res.json(animeList);
  } catch (err) {
    console.log("JIKAN SEARCH ERROR:", err);
    res.status(500).json({
      error: "Поиск временно недоступен",
      message: err.message || "Ошибка сервера",
    });
  }
});

router.get("/jikan/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `anime:${id}`;
    const cached = getCache(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const data = await fetchJson(
      `https://api.jikan.moe/v4/anime/${id}`,
      4,
      cacheKey
    );

    const mapped = mapJikanAnime(data.data);
    setCache(cacheKey, mapped, CACHE_TTL.anime);

    res.json(mapped);
  } catch (err) {
    console.log("JIKAN ANIME ERROR:", err);
    res.status(500).json({
      error: "Ошибка сервера",
      message: err.message || "Не удалось загрузить аниме",
    });
  }
});

// ВАЖНО: поиск local аниме по jikan_id
router.get("/by-jikan/:jikanId", async (req, res) => {
  try {
    const { jikanId } = req.params;

    const result = await pool.query(
      "SELECT * FROM anime WHERE jikan_id=$1 LIMIT 1",
      [Number(jikanId)]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Локальная версия не найдена" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log("GET BY JIKAN ERROR:", err);
    res.status(500).json({ error: "Ошибка получения local версии" });
  }
});

router.post("/import-jikan", async (req, res) => {
  const { jikanId, userId } = req.body;

  try {
    if (!jikanId || !userId) {
      return res.status(400).json({ message: "Нет данных" });
    }

    const user = await pool.query(
      "SELECT id, role FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (user.rows[0].role !== "admin" && user.rows[0].role !== "owner") {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const existing = await pool.query(
      "SELECT id FROM anime WHERE jikan_id=$1",
      [Number(jikanId)]
    );

    if (existing.rows.length > 0) {
      return res.json({
        message: "Аниме уже добавлено",
        id: existing.rows[0].id,
      });
    }

    const cacheKey = `anime:${jikanId}`;
    const data = await fetchJson(
      `https://api.jikan.moe/v4/anime/${jikanId}`,
      4,
      cacheKey
    );

    const anime = mapJikanAnime(data.data);

    const result = await pool.query(
      `
      INSERT INTO anime
      (jikan_id, title, genre, episodes, description, year, image, banner, type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        Number(jikanId),
        anime.title,
        anime.genre,
        anime.episodes || 0,
        anime.description || "",
        anime.year,
        anime.image || "",
        anime.banner || anime.image || "",
        anime.type || "",
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("IMPORT JIKAN ERROR:", err);
    res.status(500).json({
      error: "Ошибка сервера",
      message: err.message || "Не удалось импортировать аниме",
    });
  }
});

router.get("/comments/:animeId", async (req, res) => {
  const { animeId } = req.params;
  const contentType = String(req.query.contentType || "local");

  try {
    const result = await pool.query(
      `
      SELECT
        ac.id,
        ac.user_id,
        ac.text,
        ac.created_at,
        u.username,
        u.avatar
      FROM anime_comments ac
      JOIN users u ON u.id = ac.user_id
      WHERE ac.anime_id = $1 AND ac.content_type = $2
      ORDER BY ac.created_at DESC
      `,
      [String(animeId), contentType]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET COMMENTS ERROR:", err);
    res.status(500).json({ error: "Ошибка получения комментариев" });
  }
});

router.post("/comments", async (req, res) => {
  const { userId, animeId, contentType, text } = req.body;

  try {
    const safeText = String(text || "").trim();

    if (!userId || !animeId || !safeText) {
      return res.status(400).json({ message: "Нет данных" });
    }

    const user = await pool.query(
      "SELECT id FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const result = await pool.query(
      `
      INSERT INTO anime_comments (user_id, anime_id, content_type, text)
      VALUES ($1,$2,$3,$4)
      RETURNING id, user_id, anime_id, content_type, text, created_at
      `,
      [userId, String(animeId), contentType || "local", safeText]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("ADD COMMENT ERROR:", err);
    res.status(500).json({ error: "Ошибка добавления комментария" });
  }
});

router.delete("/comments/:commentId", async (req, res) => {
  const { commentId } = req.params;
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

    const comment = await pool.query(
      "SELECT user_id FROM anime_comments WHERE id=$1",
      [commentId]
    );

    if (!comment.rows.length) {
      return res.status(404).json({ message: "Комментарий не найден" });
    }

    const canDelete =
      String(comment.rows[0].user_id) === String(userId) ||
      user.rows[0].role === "admin" ||
      user.rows[0].role === "owner";

    if (!canDelete) {
      return res.status(403).json({ message: "Нет доступа" });
    }

    await pool.query("DELETE FROM anime_comments WHERE id=$1", [commentId]);

    res.json({ success: true });
  } catch (err) {
    console.log("DELETE COMMENT ERROR:", err);
    res.status(500).json({ error: "Ошибка удаления комментария" });
  }
});

router.post("/", async (req, res) => {
  const {
    title,
    genre,
    episodes,
    description,
    year,
    image,
    banner,
    type,
    userId,
  } = req.body;

  try {
    if (!title || !genre || !description || !userId) {
      return res.status(400).json({ message: "Заполните обязательные поля" });
    }

    const user = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (user.rows[0].role !== "admin" && user.rows[0].role !== "owner") {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const result = await pool.query(
      `
      INSERT INTO anime
      (title, genre, episodes, description, year, image, banner, type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        String(title).trim(),
        String(genre).trim(),
        episodes ? parseInt(episodes, 10) : 0,
        String(description).trim(),
        year ? parseInt(year, 10) : null,
        image || "",
        banner || "",
        type || "anime",
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log("POST ERROR:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM anime ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.log("GET ERROR:", err);
    res.status(500).json({ error: "Ошибка получения" });
  }
});

router.get("/local/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM anime WHERE id=$1",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Аниме не найдено" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.log("GET ONE LOCAL ERROR:", err);
    res.status(500).json({ error: "Ошибка получения" });
  }
});

router.delete("/:id", async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await pool.query(
      "SELECT role FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length || user.rows[0].role !== "owner") {
      return res.status(403).json({ message: "Нет доступа" });
    }

    await pool.query("DELETE FROM anime WHERE id=$1", [req.params.id]);

    res.json({ message: "Удалено" });
  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ error: "Ошибка удаления" });
  }
});

router.post("/react", async (req, res) => {
  const { userId, animeId, type, contentType } = req.body;

  try {
    if (!userId || !animeId) {
      return res.status(400).json({ message: "Нет данных" });
    }

    const safeContentType = contentType || "local";

    if (type !== "like" && type !== "dislike" && type !== null) {
      return res.status(400).json({ message: "Неверный тип реакции" });
    }

    if (type === null) {
      await pool.query(
        `
        DELETE FROM anime_reactions
        WHERE user_id=$1 AND anime_id=$2 AND content_type=$3
        `,
        [userId, String(animeId), safeContentType]
      );

      return res.json({ message: "removed" });
    }

    const existing = await pool.query(
      `
      SELECT id FROM anime_reactions
      WHERE user_id=$1 AND anime_id=$2 AND content_type=$3
      `,
      [userId, String(animeId), safeContentType]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `
        UPDATE anime_reactions
        SET type=$1
        WHERE user_id=$2 AND anime_id=$3 AND content_type=$4
        `,
        [type, userId, String(animeId), safeContentType]
      );
    } else {
      await pool.query(
        `
        INSERT INTO anime_reactions (user_id, anime_id, content_type, type)
        VALUES ($1,$2,$3,$4)
        `,
        [userId, String(animeId), safeContentType, type]
      );
    }

    res.json({ message: "OK" });
  } catch (err) {
    console.log("LIKE ERROR:", err);
    res.status(500).json({ error: "Ошибка реакции" });
  }
});

router.get("/reactions/:animeId", async (req, res) => {
  const { animeId } = req.params;
  const { userId } = req.query;
  const contentType = String(req.query.contentType || "local");

  try {
    const likes = await pool.query(
      `
      SELECT COUNT(*) FROM anime_reactions
      WHERE anime_id=$1 AND content_type=$2 AND type='like'
      `,
      [String(animeId), contentType]
    );

    const dislikes = await pool.query(
      `
      SELECT COUNT(*) FROM anime_reactions
      WHERE anime_id=$1 AND content_type=$2 AND type='dislike'
      `,
      [String(animeId), contentType]
    );

    let userReaction = null;

    if (userId) {
      const userRes = await pool.query(
        `
        SELECT type FROM anime_reactions
        WHERE user_id=$1 AND anime_id=$2 AND content_type=$3
        `,
        [userId, String(animeId), contentType]
      );

      if (userRes.rows.length > 0) {
        userReaction = userRes.rows[0].type;
      }
    }

    res.json({
      likes: parseInt(likes.rows[0].count, 10),
      dislikes: parseInt(dislikes.rows[0].count, 10),
      userReaction,
    });
  } catch (err) {
    console.log("REACTIONS ERROR:", err);
    res.status(500).json({ error: "Ошибка статистики" });
  }
});

router.post("/favorite", async (req, res) => {
  const { userId, animeId } = req.body;

  try {
    const existing = await pool.query(
      "SELECT * FROM favorites WHERE user_id=$1 AND anime_id=$2",
      [userId, animeId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "DELETE FROM favorites WHERE user_id=$1 AND anime_id=$2",
        [userId, animeId]
      );
      return res.json({ removed: true });
    }

    await pool.query(
      "INSERT INTO favorites (user_id, anime_id) VALUES ($1,$2)",
      [userId, animeId]
    );

    res.json({ added: true });
  } catch (err) {
    console.log("FAVORITE ERROR:", err);
    res.status(500).json({ error: "Ошибка избранного" });
  }
});

router.post("/repost", async (req, res) => {
  const { animeId } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM anime WHERE id=$1",
      [animeId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Аниме не найдено" });
    }

    const a = result.rows[0];

    await pool.query(
      `
      INSERT INTO anime
      (title, genre, episodes, description, year, image, banner, type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        `${a.title} (Repost)`,
        a.genre,
        a.episodes,
        a.description,
        a.year,
        a.image,
        a.banner,
        a.type,
      ]
    );

    res.json({ message: "Reposted" });
  } catch (err) {
    console.log("REPOST ERROR:", err);
    res.status(500).json({ error: "Ошибка репоста" });
  }
});

export default router;