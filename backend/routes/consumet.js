import express from 'express';

const router = express.Router();
const ANIWATCH_API = 'https://aniwatch-api-phi.vercel.app/api/v2/hianime';

// Поиск аниме
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await fetch(`${ANIWATCH_API}/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Информация об аниме и список серий
router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${ANIWATCH_API}/info?id=${id}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ссылка на видео
router.get('/watch/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const response = await fetch(`${ANIWATCH_API}/episode/sources?episodeId=${episodeId}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;