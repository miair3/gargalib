import express from 'express';
import { ANIME } from '@consumet/extensions';

const router = express.Router();
const gogoanime = new ANIME.Gogoanime();

// Поиск аниме
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await gogoanime.search(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить информацию об аниме и список серий
router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const info = await gogoanime.fetchAnimeInfo(id);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить ссылку на видео для серии
router.get('/watch/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const sources = await gogoanime.fetchEpisodeSources(episodeId);
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;