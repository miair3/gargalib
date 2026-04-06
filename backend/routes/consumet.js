import express from 'express';

const router = express.Router();

// Временный заглушка для проверки
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    res.json({ 
      results: [
        { id: "20", title: "Naruto", episodes: 220 },
        { id: "21", title: "One Piece", episodes: 1000 }
      ] 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/info/:id', async (req, res) => {
  try {
    res.json({ 
      title: "Test Anime", 
      episodes: [
        { id: "ep-1", episode_number: 1 },
        { id: "ep-2", episode_number: 2 }
      ] 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/watch/:episodeId', async (req, res) => {
  try {
    res.json({ 
      sources: [
        { url: "https://vidsrc.xyz/embed/anime/20?ep=1", quality: "iframe" }
      ] 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;