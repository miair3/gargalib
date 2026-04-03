import express from 'express';
import animepahe from 'animepahe-api';

const router = express.Router();

// Глобальная переменная для хранения сессии API
let apiSession = null;

// Вспомогательная функция для получения/обновления сессии
async function getSession() {
    if (!apiSession) {
        // Инициализируем API. Метод может называться иначе, сверьтесь с документацией.
        // Если потребуется, позже заменим на правильный вызов.
        apiSession = await animepahe.init(); 
    }
    return apiSession;
}

// Эндпоинт для ПОИСКА (пример: /api/consumet/search?q=naruto)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const session = await getSession();
        // Метод search может возвращать список аниме. Уточните по документации.
        const results = await animepahe.search(session, q);
        res.json({ results: results });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Эндпоинт для ИНФОРМАЦИИ об аниме и СПИСКА СЕРИЙ (пример: /api/consumet/info/123)
router.get('/info/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const session = await getSession();
        // Получаем детали аниме. Здесь может быть список серий внутри.
        const details = await animepahe.getAnimeDetails(session, id);
        res.json(details);
    } catch (err) {
        console.error("Info error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Эндпоинт для ВИДЕО (пример: /api/consumet/watch/episode-123)
router.get('/watch/:episodeId', async (req, res) => {
    try {
        const { episodeId } = req.params;
        const session = await getSession();
        // Получаем прямые ссылки на видео для эпизода
        const streamData = await animepahe.getStreamingLinks(session, episodeId);
        
        // Форматируем ответ так, как ждёт ваш frontend (AnimePage.jsx)
        // Ожидается массив объектов с полями url и quality
        const sources = (streamData.sources || []).map(s => ({
            url: s.url,
            quality: s.quality || 'unknown'
        }));
        
        res.json({ sources: sources });
    } catch (err) {
        console.error("Watch error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;