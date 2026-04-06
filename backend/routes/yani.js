import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

// Функция для получения токенов с yani.tv
async function getYaniTokens(animeTitle, episodeNumber) {
  try {
    // Формируем URL для поиска аниме на yani.tv
    const searchUrl = `https://yani.tv/search?q=${encodeURIComponent(animeTitle)}`;
    const searchRes = await axios.get(searchUrl);
    const $ = cheerio.load(searchRes.data);
    
    // Ищем первую ссылку на аниме
    const animeLink = $('.movie-item a').first().attr('href');
    if (!animeLink) throw new Error('Аниме не найдено');
    
    // Заходим на страницу аниме
    const animePageUrl = `https://yani.tv${animeLink}`;
    const animePageRes = await axios.get(animePageUrl);
    const $$ = cheerio.load(animePageRes.data);
    
    // Ищем iframe плеера
    const iframeSrc = $$('iframe').first().attr('src');
    if (!iframeSrc) throw new Error('Плеер не найден');
    
    // Парсим параметры из URL плеера
    const urlParams = new URLSearchParams(iframeSrc.split('?')[1]);
    const token_movie = urlParams.get('token_movie');
    const token = urlParams.get('token');
    const translation = urlParams.get('translation') || '10';
    
    return { token_movie, token, translation };
  } catch (err) {
    console.error('Yani parser error:', err.message);
    return null;
  }
}

// Эндпоинт для получения ссылки на плеер
router.get('/embed', async (req, res) => {
  try {
    const { title, episode } = req.query;
    if (!title || !episode) {
      return res.status(400).json({ error: 'Укажите title и episode' });
    }
    
    const tokens = await getYaniTokens(title, parseInt(episode));
    if (!tokens) {
      return res.status(404).json({ error: 'Не удалось получить токены' });
    }
    
    const embedUrl = `https://alloha.yani.tv/?token_movie=${tokens.token_movie}&token=${tokens.token}&translation=${tokens.translation}&season=1&episode=${episode}&hidden=translation,season,episode`;
    
    res.json({ url: embedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;