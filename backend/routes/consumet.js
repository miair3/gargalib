import express from 'express';

const router = express.Router();
const JIKAN_API = 'https://api.jikan.moe/v4';

// Вспомогательная функция для задержки (Jikan требует не более 3 запросов в секунду)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Поиск аниме через Jikan
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await fetch(`${JIKAN_API}/anime?q=${encodeURIComponent(q)}&limit=10`);
    const data = await response.json();
    
    const results = data.data.map(anime => ({
      id: anime.mal_id,
      title: anime.title,
      episodes: anime.episodes || 0,
      image: anime.images.jpg.image_url
    }));
    
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Информация об аниме и список серий через Jikan
router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем информацию об аниме
    const animeRes = await fetch(`${JIKAN_API}/anime/${id}/full`);
    const animeData = await animeRes.json();
    const anime = animeData.data;
    
    // Получаем список серий (если есть)
    let episodes = [];
    if (anime.episodes && anime.episodes > 0) {
      await delay(500); // Jikan rate limit
      const episodesRes = await fetch(`${JIKAN_API}/anime/${id}/episodes?limit=100`);
      const episodesData = await episodesRes.json();
      
      episodes = episodesData.data.map(ep => ({
        id: `${id}-${ep.mal_id}`,
        episode_number: ep.mal_id,
        title: ep.title || `Серия ${ep.mal_id}`
      }));
    }
    
    res.json({
      id: anime.mal_id,
      title: anime.title,
      description: anime.synopsis,
      image: anime.images.jpg.image_url,
      banner: anime.images.jpg.large_image_url,
      year: anime.year,
      score: anime.score,
      episodes: episodes
    });
  } catch (err) {
    console.error("Info error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Ссылка на видео через VidSrc
router.get('/watch/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const [animeId, episodeNum] = episodeId.split('-');
    
    res.json({ 
      sources: [{
        url: `https://vidsrc.xyz/embed/anime/${animeId}?ep=${episodeNum}`,
        quality: "iframe"
      }]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;