import express from 'express';
import { ANIME } from '@consumet/extensions';

const router = express.Router();
const hianime = new ANIME.Hianime();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await hianime.search(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const info = await hianime.fetchAnimeInfo(id);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/watch/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const sources = await hianime.fetchEpisodeSources(episodeId);
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;