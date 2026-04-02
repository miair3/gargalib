import express from 'express';

const router = express.Router();
const ENIME_API = 'https://api.enime.moe';

// Поиск аниме
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await fetch(`${ENIME_API}/search?query=${encodeURIComponent(q)}`);
    const data = await response.json();
    res.json({ results: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Информация об аниме и список серий
router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${ENIME_API}/anime/${id}`);
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
    const response = await fetch(`${ENIME_API}/episode/${episodeId}`);
    const data = await response.json();
    
    // Enime возвращает ссылки на видео в другом формате
    const sources = data.sources?.map(s => ({
      url: s.url,
      quality: s.quality || 'unknown'
    })) || [];
    
    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;