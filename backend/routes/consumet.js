import express from 'express';

const router = express.Router();

// AniList для информации об аниме (стабилен годами)
const ANILIST_API = 'https://graphql.anilist.co';

// Anify API для видео (активная замена умершего aniwatch-api)
const ANIFY_API = 'https://api.anify.tv';

// Поиск аниме через AniList
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const query = `query ($search: String) {
      Page(perPage: 10) {
        media(search: $search, type: ANIME) {
          id
          title { romaji english }
          coverImage { large }
          bannerImage
          episodes
          status
          year: startDate { year }
        }
      }
    }`;
    
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: q } })
    });
    const data = await response.json();
    res.json({ results: data.data.Page.media });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Информация об аниме и список серий через Anify
router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${ANIFY_API}/info/${id}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ссылка на видео через Anify
router.get('/watch/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const response = await fetch(`${ANIFY_API}/watch/${episodeId}`);
    const data = await response.json();
    res.json({ sources: data.sources || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;