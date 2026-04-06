import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Play,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Star,
  Plus,
  Trash2,
  Calendar,
  Clapperboard,
  Eye,
} from "lucide-react";
import BannedScreen from "../components/BannedScreen";

const API_BASE = "https://gargalib-backend.onrender.com";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const glass =
  "border border-white/10 bg-white/[0.07] backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.38)]";

const pillBase =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-xl";

const AnimatedOrb = ({ className, duration = 10 }) => (
  <motion.div
    className={className}
    animate={{ y: [0, -20, 0], x: [0, 12, 0], scale: [1, 1.08, 1] }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
  />
);

const FloatingPetals = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: 18 }).map((_, i) => (
      <span
        key={i}
        className="absolute block rounded-full bg-gradient-to-br from-pink-200/80 via-pink-300/60 to-fuchsia-400/40 blur-[1px]"
        style={{
          width: `${10 + (i % 4) * 4}px`,
          height: `${8 + (i % 3) * 4}px`,
          left: `${(i * 7) % 100}%`,
          top: `-${10 + i * 4}%`,
          animation: `petalFall ${12 + (i % 5) * 3}s linear ${i * 0.8}s infinite`,
          borderRadius: "70% 30% 60% 40% / 60% 40% 60% 40%",
          transform: `rotate(${i * 23}deg)`,
        }}
      />
    ))}
  </div>
);

const Stars = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
    {Array.from({ length: 28 }).map((_, i) => (
      <span
        key={i}
        className="absolute block rounded-full bg-white"
        style={{
          width: `${(i % 3) + 2}px`,
          height: `${(i % 3) + 2}px`,
          left: `${(i * 13) % 100}%`,
          top: `${(i * 19) % 100}%`,
          boxShadow: "0 0 12px rgba(255,255,255,0.9)",
          animation: `twinkle ${2.5 + (i % 4)}s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </div>
);

const StatPill = ({ icon, children }) => (
  <motion.div
    variants={fadeUp}
    whileHover={{ y: -2, scale: 1.02 }}
    className={pillBase}
  >
    {icon}
    <span>{children}</span>
  </motion.div>
);

const ActionButton = ({
  active,
  icon,
  children,
  onClick,
  disabled,
  variant = "default",
}) => {
  const variants = {
    default: active
      ? "bg-white text-slate-950"
      : "border border-white/10 bg-white/8 text-white hover:bg-white/14",
    pink: active
      ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white"
      : "border border-white/10 bg-white/8 text-white hover:bg-white/14",
    red: active
      ? "bg-gradient-to-r from-rose-500 to-red-500 text-white"
      : "border border-white/10 bg-white/8 text-white hover:bg-white/14",
    green: active
      ? "bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950"
      : "border border-white/10 bg-white/8 text-white hover:bg-white/14",
    gradient:
      "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] hover:shadow-[0_16px_45px_rgba(168,85,247,0.45)]",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  );
};

const AnimePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(null);

  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [addingAnime, setAddingAnime] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("currentUser"));
  } catch {
    user = null;
  }

  const isJikan = new URLSearchParams(location.search).get("source") === "jikan";
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isOwner = user?.role === "owner";

  const contentType = isJikan ? "jikan" : "local";
  const contentId = String(id);

  const getBanInfo = (currentUser) => {
    if (!currentUser) return { banned: false, reason: "", until: null };

    const bannedFlag =
      currentUser.isBanned === true ||
      Boolean(currentUser.banned_until) ||
      Boolean(currentUser.banUntil);

    if (!bannedFlag) {
      return { banned: false, reason: "", until: null };
    }

    const until = currentUser.banUntil || currentUser.banned_until || null;
    const reason = currentUser.banReason || currentUser.ban_reason || "Без причины";

    if (!until) return { banned: true, reason, until: null };

    const banEnd = new Date(until).getTime();
    if (Number.isNaN(banEnd)) return { banned: true, reason, until };
    if (Date.now() >= banEnd) return { banned: false, reason: "", until: null };

    return { banned: true, reason, until };
  };

  const banInfo = useMemo(() => getBanInfo(user), [user]);

  const getCurrentUserId = () => user?.id || user?._id || null;

  const getFavoritesKey = () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return "";
    return isJikan ? `favorites_jikan_${currentUserId}` : `favorites_${currentUserId}`;
  };

  const loadAnime = async () => {
    try {
      if (isJikan) {
        const localCheckRes = await fetch(
          `${API_BASE}/api/anime/by-jikan/${id}`,
          { cache: "no-store" }
        );

        if (localCheckRes.ok) {
          const localAnime = await localCheckRes.json();

          if (localAnime?.id) {
            navigate(`/anime/${localAnime.id}`, { replace: true });
            return;
          }
        }

        const res = await fetch(`${API_BASE}/api/anime/jikan/${id}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          setAnime(null);
          return;
        }

        setAnime({
          ...data,
          banner: data.banner || data.image,
          description: data.description || "Описание пока отсутствует.",
        });
        return;
      }

      const res = await fetch(`${API_BASE}/api/anime/local/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        setAnime(null);
        return;
      }

      setAnime(data || null);
    } catch (err) {
      console.log("LOAD ANIME ERROR:", err);
      setAnime(null);
    }
  };

  const loadEpisodes = async () => {
    if (isJikan) return;

    try {
      const res = await fetch(`${API_BASE}/api/episodes/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setEpisodes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("LOAD EPISODES ERROR:", err);
      setEpisodes([]);
    }
  };

  const loadConsumetEpisodes = async (animeTitle) => {
  try {
    // Сначала ищем аниме по названию
    const searchRes = await fetch(`${API_BASE}/api/consumet/search?q=${encodeURIComponent(animeTitle)}`);
    const searchData = await searchRes.json();
    
    if (searchData.results && searchData.results.length > 0) {
      const animeId = searchData.results[0].id;
      
      // Получаем серии
      const infoRes = await fetch(`${API_BASE}/api/consumet/info/${animeId}`);
      const infoData = await infoRes.json();
      
      if (infoData.episodes && infoData.episodes.length > 0) {
        setEpisodes(infoData.episodes);
      }
    }
  } catch (err) {
    console.log("LOAD CONSUMET EPISODES ERROR:", err);
  }
};

  const loadFavoriteState = () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;
    const key = getFavoritesKey();
    const fav = JSON.parse(localStorage.getItem(key)) || [];
    setFavorite(fav.map(String).includes(String(contentId)));
  };

  const loadReactions = async () => {
    const currentUserId = getCurrentUserId();

    try {
      const query = new URLSearchParams({ contentType });
      if (currentUserId) {
        query.append("userId", currentUserId);
      }

      const res = await fetch(
        `${API_BASE}/api/anime/reactions/${contentId}?${query.toString()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("LOAD REACTIONS ERROR:", data);
        return;
      }

      setCounts({
        likes: Number(data.likes) || 0,
        dislikes: Number(data.dislikes) || 0,
      });

      setLiked(data.userReaction === "like");
      setDisliked(data.userReaction === "dislike");
    } catch (err) {
      console.log("LOAD REACTIONS ERROR:", err);
    }
  };

  const loadComments = async () => {
    try {
      setCommentsLoading(true);
      const res = await fetch(
        `${API_BASE}/api/anime/comments/${contentId}?contentType=${contentType}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("LOAD COMMENTS ERROR:", err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const syncFavoritesToDb = async (animeIds) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || isJikan) return;

    try {
      await fetch(`${API_BASE}/api/users/favorites/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, animeIds }),
      });
    } catch (err) {
      console.log("SYNC FAVORITES ERROR:", err);
    }
  };

  useEffect(() => {
  if (banInfo.banned) return;

  const fetchData = async () => {
    await loadAnime();
    
    // Если аниме загрузилось и это не Jikan — загружаем серии из Consumet
    if (!isJikan && anime?.title) {
      await loadConsumetEpisodes(anime.title);
    }
    
    if (!isJikan) {
      await loadEpisodes();
    } else {
      setEpisodes([]);
      setCurrentVideo(null);
      setCurrentIndex(null);
    }
  };
  
  fetchData();

  loadReactions();
  loadComments();

  if (user?.id || user?._id) {
    loadFavoriteState();
  } else {
    setLiked(false);
    setDisliked(false);
    setFavorite(false);
  }

  const handleFocus = () => {
    loadReactions();
  };

  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      loadReactions();
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [id, location.search, banInfo.banned, anime?.title]);

  const handleLike = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || !contentId || reactionLoading || banInfo.banned) return;

    const prevLiked = liked;
    const prevDisliked = disliked;
    const prevCounts = { ...counts };
    const nextLiked = !liked;

    setReactionLoading(true);
    setLiked(nextLiked);
    setDisliked(false);
    setCounts({
      likes: counts.likes + (nextLiked ? 1 : -1),
      dislikes: counts.dislikes - (disliked ? 1 : 0),
    });

    try {
      const res = await fetch(`${API_BASE}/api/anime/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          animeId: contentId,
          contentType,
          type: nextLiked ? "like" : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLiked(prevLiked);
        setDisliked(prevDisliked);
        setCounts(prevCounts);
        alert(data.message || data.error || "Ошибка лайка");
        return;
      }

      await loadReactions();
    } catch (err) {
      console.log("LIKE ERROR:", err);
      setLiked(prevLiked);
      setDisliked(prevDisliked);
      setCounts(prevCounts);
    } finally {
      setReactionLoading(false);
    }
  };

  const handleDislike = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || !contentId || reactionLoading || banInfo.banned) return;

    const prevLiked = liked;
    const prevDisliked = disliked;
    const prevCounts = { ...counts };
    const nextDisliked = !disliked;

    setReactionLoading(true);
    setDisliked(nextDisliked);
    setLiked(false);
    setCounts({
      likes: counts.likes - (liked ? 1 : 0),
      dislikes: counts.dislikes + (nextDisliked ? 1 : -1),
    });

    try {
      const res = await fetch(`${API_BASE}/api/anime/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          animeId: contentId,
          contentType,
          type: nextDisliked ? "dislike" : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLiked(prevLiked);
        setDisliked(prevDisliked);
        setCounts(prevCounts);
        alert(data.message || data.error || "Ошибка дизлайка");
        return;
      }

      await loadReactions();
    } catch (err) {
      console.log("DISLIKE ERROR:", err);
      setLiked(prevLiked);
      setDisliked(prevDisliked);
      setCounts(prevCounts);
    } finally {
      setReactionLoading(false);
    }
  };

  const handleFavorite = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || !contentId || banInfo.banned) return;

    const key = getFavoritesKey();
    let fav = JSON.parse(localStorage.getItem(key)) || [];

    if (fav.map(String).includes(String(contentId))) {
      fav = fav.filter((item) => String(item) !== String(contentId));
      setFavorite(false);
    } else {
      fav.push(contentId);
      setFavorite(true);
    }

    localStorage.setItem(key, JSON.stringify(fav));

    if (!isJikan) {
      await syncFavoritesToDb(fav);
    }
  };

  const handleAddComment = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || !commentText.trim() || banInfo.banned) return;

    try {
      const res = await fetch(`${API_BASE}/api/anime/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          animeId: contentId,
          contentType,
          text: commentText.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Ошибка добавления комментария");
        return;
      }

      setCommentText("");
      loadComments();
    } catch (err) {
      console.log("ADD COMMENT ERROR:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId || banInfo.banned) return;

    try {
      const res = await fetch(`${API_BASE}/api/anime/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Ошибка удаления комментария");
        return;
      }

      loadComments();
    } catch (err) {
      console.log("DELETE COMMENT ERROR:", err);
    }
  };

  const handleAddAnime = async () => {
    if (!isJikan || !isAdmin || !anime || banInfo.banned) return;

    try {
      setAddingAnime(true);
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        alert("Не найден id пользователя");
        return;
      }

      const res = await fetch(`${API_BASE}/api/anime/import-jikan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jikanId: Number(id), userId: currentUserId }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Ошибка добавления аниме");
        return;
      }

      if (data?.id) {
        navigate(`/anime/${data.id}`);
        return;
      }

      alert("Аниме добавлено, но id не пришёл с сервера");
    } catch (err) {
      console.log("IMPORT JIKAN ERROR:", err);
      alert("Ошибка сервера при добавлении аниме");
    } finally {
      setAddingAnime(false);
    }
  };

  const handleDeleteEpisode = async (episodeId) => {
    const currentUserId = getCurrentUserId();
    if (!isOwner || !episodeId || !currentUserId || banInfo.banned) return;

    const confirmDelete = window.confirm("Удалить эту серию?");
    if (!confirmDelete) return;

    try {
      const deletedIndex = episodes.findIndex(
        (episode) => String(episode.id) === String(episodeId)
      );

      const res = await fetch(`${API_BASE}/api/episodes/${episodeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Ошибка удаления серии");
        return;
      }

      const updatedEpisodes = episodes.filter(
        (episode) => String(episode.id) !== String(episodeId)
      );

      setEpisodes(updatedEpisodes);

      if (currentIndex !== null) {
        if (deletedIndex === currentIndex) {
          setCurrentVideo(null);
          setCurrentIndex(null);
        } else if (deletedIndex < currentIndex) {
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
      }
    } catch (err) {
      console.log("DELETE EPISODE ERROR:", err);
    }
  };

  const markAsWatched = () => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !contentId || isJikan || banInfo.banned) return;

  const key = `watched_${currentUserId}`;
  const watched = JSON.parse(localStorage.getItem(key)) || [];

  if (!watched.map(String).includes(String(contentId))) {
    watched.push(String(contentId));
    localStorage.setItem(key, JSON.stringify(watched));
    window.dispatchEvent(new Event("userChanged"));
  }
};

const playEpisode = async (episode, index) => {
  if (!episode || banInfo.banned) return;
  
  setLoadingEpisodes(true);
  try {
    // Берём ID аниме из твоей базы (или используем что-то другое)
    const animeId = anime?.externalId || anime?.id;
    const episodeNum = episode.episode_number;
    
    // Используем VidSrc API для получения iframe
    const embedUrl = `https://vidsrc.xyz/embed/anime/${animeId}?ep=${episodeNum}`;
    
    setCurrentVideo(embedUrl);
    setCurrentIndex(index);
    markAsWatched();
  } catch (err) {
    console.log("PLAY EPISODE ERROR:", err);
    alert("Ошибка загрузки плеера");
  } finally {
    setLoadingEpisodes(false);
  }
};

const nextEpisode = () => {
  if (currentIndex !== null && currentIndex < episodes.length - 1) {
    const next = currentIndex + 1;
    playEpisode(episodes[next], next);
  }
};

const prevEpisode = () => {
  if (currentIndex !== null && currentIndex > 0) {
    const prev = currentIndex - 1;
    playEpisode(episodes[prev], prev);
  }
};

  const handleVideoEnd = () => {
    if (currentIndex === null) return;
    if (currentIndex === episodes.length - 1) {
      markAsWatched();
    } else {
      nextEpisode();
    }
  };

  const shortDescription = useMemo(() => {
    const text = anime?.description || "Описание отсутствует.";
    if (showFullDescription) return text;
    if (text.length <= 300) return text;
    return `${text.slice(0, 300)}...`;
  }, [anime?.description, showFullDescription]);

  const formatCommentDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  if (banInfo.banned) {
    return <BannedScreen reason={banInfo.reason} until={banInfo.until} />;
  }

  if (!anime) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] text-white">
        <AnimatedOrb className="absolute left-10 top-12 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <AnimatedOrb
          className="absolute right-10 top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"
          duration={14}
        />
        <Stars />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl px-8 py-5 text-lg ${glass}`}
        >
          Загрузка...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] text-white">
        <AnimatedOrb className="absolute left-10 top-12 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <AnimatedOrb
          className="absolute right-10 top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"
          duration={14}
        />
        <Stars />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl px-8 py-5 text-lg ${glass}`}
        >
          Войдите в аккаунт
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatSoft {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(-1deg); }
        }
        @keyframes glowPulse {
          0%,100% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes twinkle {
          0%,100% { opacity: .25; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes petalFall {
          0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; }
          10% { opacity: .95; }
          50% { transform: translate3d(60px,50vh,0) rotate(160deg); }
          100% { transform: translate3d(-50px,115vh,0) rotate(320deg); opacity: 0; }
        }
        @keyframes meshMove {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          33% { transform: translate3d(30px,-25px,0) scale(1.08); }
          66% { transform: translate3d(-20px,20px,0) scale(0.96); }
        }
        @keyframes heroGlow {
          0%,100% { transform: scale(1.04) translateY(0px); filter: saturate(1); }
          50% { transform: scale(1.08) translateY(-6px); filter: saturate(1.18); }
        }
        .anime-premium-card::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(244,114,182,0.35), rgba(34,211,238,0.2), rgba(168,85,247,0.28));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity .35s ease;
          pointer-events: none;
        }
        .anime-premium-card:hover::before { opacity: 1; }
      `}</style>

      <div className="relative min-h-screen overflow-hidden bg-[#060816] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom,rgba(244,114,182,0.16),transparent_34%),linear-gradient(180deg,#050816_0%,#0c1330_45%,#190f36_100%)]" />
        <div
          className="pointer-events-none absolute -left-24 top-0 h-[22rem] w-[22rem] rounded-full bg-pink-500/20 blur-3xl"
          style={{ animation: "meshMove 13s ease-in-out infinite" }}
        />
        <div
          className="pointer-events-none absolute right-[-6rem] top-[8%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/20 blur-3xl"
          style={{ animation: "meshMove 16s ease-in-out infinite reverse" }}
        />
        <div
          className="pointer-events-none absolute bottom-[-5rem] left-[24%] h-[20rem] w-[20rem] rounded-full bg-violet-500/20 blur-3xl"
          style={{ animation: "meshMove 14s ease-in-out infinite" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent)]" />
        <Stars />
        <FloatingPetals />
        <AnimatedOrb className="absolute left-[-80px] top-[70px] h-[360px] w-[360px] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <AnimatedOrb
          className="absolute right-[-70px] top-[180px] h-[340px] w-[340px] rounded-full bg-cyan-400/20 blur-3xl"
          duration={14}
        />
        <AnimatedOrb
          className="absolute bottom-[-80px] left-[24%] h-[300px] w-[300px] rounded-full bg-violet-500/20 blur-3xl"
          duration={12}
        />

        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6 sm:pt-12 lg:px-8">
          <div className="grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="order-2 lg:order-1"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-pink-200 backdrop-blur-md sm:text-sm"
              >
                <Sparkles className="h-4 w-4" /> Anime Streaming Platform
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="mt-5 text-4xl font-black leading-tight sm:text-6xl xl:text-7xl"
              >
                <span className="block bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  {anime.title}
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base lg:text-lg lg:leading-8"
              >
                {anime.genre || "Без жанра"}. Смотри серии, ставь реакции, сохраняй
                в избранное и наслаждайся красивой аниме-страницей.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-3">
                {anime.year && (
                  <StatPill icon={<Calendar className="h-4 w-4" />}>
                    Год: {anime.year}
                  </StatPill>
                )}
                {anime.type && (
                  <StatPill icon={<Clapperboard className="h-4 w-4" />}>
                    Тип: {anime.type}
                  </StatPill>
                )}
                {anime.score && (
                  <StatPill icon={<Star className="h-4 w-4" />}>
                    Рейтинг: {anime.score}
                  </StatPill>
                )}
                <StatPill icon={<Eye className="h-4 w-4" />}>
                  {isJikan ? "Можно импортировать" : `${episodes.length || 0} эпизодов`}
                </StatPill>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-3">
                {!isJikan && episodes.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => playEpisode(episodes[0], 0)}
                    className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-6 py-4 font-semibold text-white shadow-2xl shadow-fuchsia-900/35"
                  >
                    <span className="flex items-center gap-2">
                      <Play className="h-5 w-5" /> Смотреть с первой серии
                    </span>
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(-1)}
                  className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
                >
                  Назад
                </motion.button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.8 }}
              className="order-1 lg:order-2"
            >
              <div className="anime-premium-card rounded-[34px] border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div
                  className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/40"
                  style={{ animation: "floatSoft 7s ease-in-out infinite" }}
                >
                  <img
                    src={anime.banner || anime.image}
                    alt={anime.title}
                    className="h-[290px] w-full object-cover sm:h-[420px]"
                    style={{ animation: "heroGlow 8s ease-in-out infinite" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b18]/80 via-[#070b18]/20 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_42%)]" />
                  <div
                    className="absolute -right-8 top-6 h-36 w-36 rounded-full bg-pink-400/20 blur-3xl"
                    style={{ animation: "glowPulse 4s ease-in-out infinite" }}
                  />
                  <div
                    className="absolute left-6 bottom-6 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl"
                    style={{ animation: "glowPulse 5s ease-in-out infinite" }}
                  />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    {anime.year && (
                      <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                        {anime.year}
                      </span>
                    )}
                    {anime.type && (
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 backdrop-blur-md">
                        {anime.type}
                      </span>
                    )}
                    {anime.score && (
                      <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-200 backdrop-blur-md">
                        ⭐ {anime.score}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md">
                    <p className="text-2xl font-bold text-pink-300">{counts.likes}</p>
                    <p className="text-sm text-slate-300">Лайки</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md">
                    <p className="text-2xl font-bold text-cyan-300">{episodes.length}</p>
                    <p className="text-sm text-slate-300">Серии</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md">
                    <p className="text-2xl font-bold text-violet-300">{comments.length}</p>
                    <p className="text-sm text-slate-300">Комментарии</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
            <motion.aside
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className={`anime-premium-card sticky top-6 h-fit rounded-[32px] p-4 ${glass}`}
            >
              <div className="group relative overflow-hidden rounded-[28px] border border-white/10">
                <img
                  src={anime.image}
                  alt={anime.title}
                  className="h-[440px] w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_10%,rgba(255,255,255,0.14)_35%,transparent_60%)] -translate-x-full transition duration-[1200ms] group-hover:translate-x-full" />
              </div>

              <div className="mt-5 grid gap-3">
                <ActionButton
                  active={liked}
                  onClick={handleLike}
                  disabled={reactionLoading}
                  variant="green"
                  icon={<ThumbsUp className="h-4 w-4" />}
                >
                  {reactionLoading ? "Загрузка..." : `Нравится · ${counts.likes}`}
                </ActionButton>

                <ActionButton
                  active={disliked}
                  onClick={handleDislike}
                  disabled={reactionLoading}
                  variant="red"
                  icon={<ThumbsDown className="h-4 w-4" />}
                >
                  {reactionLoading ? "Загрузка..." : `Не нравится · ${counts.dislikes}`}
                </ActionButton>

                <ActionButton
                  active={favorite}
                  onClick={handleFavorite}
                  variant="pink"
                  icon={<Heart className="h-4 w-4" fill={favorite ? "currentColor" : "none"} />}
                >
                  {favorite ? "В избранном" : "В избранное"}
                </ActionButton>

                {isJikan && isAdmin && (
                  <ActionButton
                    onClick={handleAddAnime}
                    disabled={addingAnime}
                    variant="gradient"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    {addingAnime ? "Добавление..." : "Добавить аниме"}
                  </ActionButton>
                )}

                {!isJikan && isAdmin && (
                  <ActionButton
                    onClick={() => navigate(`/add-episode/${anime.id}`)}
                    variant="gradient"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Добавить серию
                  </ActionButton>
                )}
              </div>
            </motion.aside>

            <motion.section
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-8"
            >
              <motion.div
                variants={fadeUp}
                className={`anime-premium-card rounded-[32px] p-6 sm:p-8 ${glass}`}
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-4xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-200">
                      <Sparkles className="h-4 w-4" /> Описание
                    </div>
                    <h2 className="mt-5 text-2xl font-bold sm:text-3xl">О чём это аниме</h2>
                    <p className="mt-4 text-[15px] leading-8 text-slate-300 sm:text-base">
                      {shortDescription}
                    </p>
                    {(anime.description || "").length > 300 && (
                      <button
                        onClick={() => setShowFullDescription((prev) => !prev)}
                        className="mt-5 rounded-2xl border border-white/10 bg-white/8 px-4 py-2 font-medium text-white transition hover:bg-white/14"
                      >
                        {showFullDescription ? "Скрыть" : "Показать всё"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {!isJikan && currentVideo && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={`anime-premium-card overflow-hidden rounded-[32px] ${glass}`}
                  >
                    <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-200">
                          Now Watching
                        </p>
                        <h3 className="mt-2 text-lg font-bold sm:text-2xl">
                          {anime.title} — Серия {currentIndex !== null ? currentIndex + 1 : 1}
                        </h3>
                      </div>
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
                        Автопереход включён
                      </div>
                    </div>

                    <iframe
                      src={currentVideo}
                      className="h-[240px] w-full bg-black sm:h-[420px] xl:h-[560px]"
                      frameBorder="0"
                      allowFullScreen
                      title="Video Player"
                    />

                    <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-4">
                      <motion.button
                        whileHover={{ scale: currentIndex === null || currentIndex === 0 ? 1 : 1.03 }}
                        whileTap={{ scale: currentIndex === null || currentIndex === 0 ? 1 : 0.98 }}
                        onClick={prevEpisode}
                        disabled={currentIndex === null || currentIndex === 0}
                        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 font-semibold text-white disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" /> Назад
                      </motion.button>

                      <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-slate-200">
                        Серия {currentIndex !== null ? currentIndex + 1 : 1} из {episodes.length}
                      </div>

                      <motion.button
                        whileHover={{
                          scale:
                            currentIndex === null || currentIndex === episodes.length - 1
                              ? 1
                              : 1.03,
                        }}
                        whileTap={{
                          scale:
                            currentIndex === null || currentIndex === episodes.length - 1
                              ? 1
                              : 0.98,
                        }}
                        onClick={nextEpisode}
                        disabled={currentIndex === null || currentIndex === episodes.length - 1}
                        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 px-4 py-3 font-semibold text-white disabled:opacity-40"
                      >
                        Далее <ChevronRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                variants={fadeUp}
                className={`anime-premium-card rounded-[32px] p-6 sm:p-8 ${glass}`}
              >
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Серии</h2>
                    <p className="mt-1 text-sm text-slate-300">Выберите серию для просмотра</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-slate-200">
                    {episodes.length} эп.
                  </div>
                </div>

                {isJikan ? (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
                    <p className="text-xl font-bold text-white">Аниме пока недоступно</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Это аниме ещё не добавлено на сайт. Пожалуйста, загляните немного позже —
                      возможно, оно скоро появится для просмотра.
                    </p>
                    {isAdmin && (
                      <div className="mt-5 flex justify-center">
                        <ActionButton
                          onClick={handleAddAnime}
                          disabled={addingAnime}
                          variant="gradient"
                          icon={<Plus className="h-4 w-4" />}
                        >
                          {addingAnime ? "Добавление..." : "Добавить аниме"}
                        </ActionButton>
                      </div>
                    )}
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
                    <p className="text-xl font-bold text-white">Серии скоро появятся</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Сейчас для этого аниме серии ещё не загружены. Пожалуйста, загляните
                      позже — они могут появиться совсем скоро.
                    </p>
                    {isAdmin && (
                      <div className="mt-5 flex justify-center">
                        <ActionButton
                          onClick={() => navigate(`/add-episode/${anime.id}`)}
                          variant="gradient"
                          icon={<Plus className="h-4 w-4" />}
                        >
                          Добавить серию
                        </ActionButton>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  >
                    {episodes.map((ep, index) => {
                      const isActive = currentIndex === index;
                      return (
                        <motion.div
                          key={ep.id}
                          variants={fadeUp}
                          whileHover={{ y: -6, scale: 1.01 }}
                          className={`anime-premium-card group relative overflow-hidden rounded-[28px] border p-5 transition ${
                            isActive
                              ? "border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 via-violet-500/10 to-cyan-400/10 shadow-[0_18px_45px_rgba(217,70,239,0.15)]"
                              : "border-white/10 bg-white/[0.05] hover:bg-white/[0.08]"
                          }`}
                          style={{
                            animation: `cardReveal .75s cubic-bezier(.2,.8,.2,1) forwards`,
                            animationDelay: `${Math.min(index * 70, 900)}ms`,
                            opacity: 0,
                          }}
                        >
                          <div className="pointer-events-none absolute -right-10 top-3 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-3xl transition duration-700 group-hover:scale-125" />
                          <div className="flex items-start justify-between gap-4">
                            <div
                               onClick={() => playEpisode(ep, index)}
                              className="flex-1 cursor-pointer"
                            >
                              <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                                Episode
                              </p>
                              <p className="mt-3 text-4xl font-black text-white">
                                {ep.episode_number}
                              </p>
                              <p className="mt-2 text-lg font-bold text-white">
                                Серия {ep.episode_number}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                Нажмите, чтобы открыть плеер.
                              </p>
                            </div>

                            <div className="flex flex-col gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.96 }}
                                 onClick={() => playEpisode(ep, index)}
                                className="rounded-2xl border border-white/10 bg-white/10 p-3 text-fuchsia-200"
                              >
                                <Play className="h-4 w-4" />
                              </motion.button>

                              {isOwner && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => handleDeleteEpisode(ep.id)}
                                  className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              )}
                            </div>
                          </div>

                          {isActive && (
                            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
                              <Sparkles className="h-3.5 w-3.5" /> Сейчас выбрана
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>

              <motion.div
                variants={fadeUp}
                className={`anime-premium-card rounded-[32px] p-6 sm:p-8 ${glass}`}
              >
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
                      <MessageCircle className="h-5 w-5 text-fuchsia-200" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Комментарии</h2>
                      <p className="text-sm text-slate-300">Обсуждение и отзывы пользователей</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-slate-200">
                    {comments.length}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Напишите комментарий..."
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-fuchsia-400/40 focus:bg-white/10"
                  />
                  <div className="mt-4 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddComment}
                      className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 px-6 py-3 font-bold text-white shadow-[0_14px_35px_rgba(168,85,247,0.35)]"
                    >
                      Отправить комментарий
                    </motion.button>
                  </div>
                </div>

                {commentsLoading ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-slate-300">
                    Загрузка комментариев...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-slate-300">
                    Комментариев пока нет
                  </div>
                ) : (
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="mt-6 space-y-4"
                  >
                    {comments.map((comment, index) => {
                      const canDelete =
                        String(comment.user_id) === String(getCurrentUserId()) ||
                        user?.role === "admin" ||
                        user?.role === "owner";

                      return (
                        <motion.div
                          key={comment.id}
                          variants={fadeUp}
                          whileHover={{ y: -2 }}
                          className="anime-premium-card rounded-[26px] border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                          style={{
                            animation: `cardReveal .7s cubic-bezier(.2,.8,.2,1) forwards`,
                            animationDelay: `${Math.min(index * 60, 600)}ms`,
                            opacity: 0,
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <img
                                src={
                                  comment.avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    comment.username || "User"
                                  )}`
                                }
                                alt={comment.username}
                                className="h-12 w-12 rounded-full border border-white/10 object-cover"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold text-white">
                                    {comment.username || "Пользователь"}
                                  </p>
                                  <span className="text-xs text-slate-400">
                                    {formatCommentDate(comment.created_at)}
                                  </span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                                  {comment.text}
                                </p>
                              </div>
                            </div>

                            {canDelete && (
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => handleDeleteComment(comment.id)}
                                className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                              >
                                Удалить
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            </motion.section>
          </div>
        </main>
      </div>
    </>
  );
};

export default AnimePage;