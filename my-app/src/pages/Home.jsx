import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "https://gargalib-backend.onrender.com";

const Home = () => {
  const navigate = useNavigate();

  const [popularAnime, setPopularAnime] = useState([]);
  const [newAnime, setNewAnime] = useState([]);

  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);

  const [errorPopular, setErrorPopular] = useState("");
  const [errorNew, setErrorNew] = useState("");

  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [showAllAnime, setShowAllAnime] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);

  const yearMenuRef = useRef(null);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    user = null;
  }

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  useEffect(() => {
    loadHomeFeed();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(e.target)) {
        setYearMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadHomeFeed = async () => {
    try {
      setLoadingPopular(true);
      setLoadingNew(true);
      setErrorPopular("");
      setErrorNew("");

      const res = await fetch(`${API_BASE}/api/anime/home-feed`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorPopular(data?.message || "Не удалось загрузить популярное аниме");
        setErrorNew(data?.message || "Не удалось загрузить новое аниме");
        setPopularAnime([]);
        setNewAnime([]);
        return;
      }

      const popular = Array.isArray(data.popularAnime) ? data.popularAnime : [];
      const fresh = Array.isArray(data.newAnime) ? data.newAnime : [];

      setPopularAnime(popular);
      setNewAnime(fresh);
    } catch (err) {
      console.log("HOME FEED ERROR:", err);
      setErrorPopular("Не удалось загрузить популярное аниме");
      setErrorNew("Не удалось загрузить новое аниме");
      setPopularAnime([]);
      setNewAnime([]);
    } finally {
      setLoadingPopular(false);
      setLoadingNew(false);
    }
  };

  const openAnimePage = async (anime) => {
    try {
      const res = await fetch(`${API_BASE}/api/anime/by-jikan/${anime.id}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const localAnime = await res.json();

        if (localAnime?.id) {
          navigate(`/anime/${localAnime.id}`);
          return;
        }
      }

      navigate(`/anime/${anime.id}?source=jikan`);
    } catch (err) {
      console.log("OPEN ANIME ERROR:", err);
      navigate(`/anime/${anime.id}?source=jikan`);
    }
  };

  const uniqueAnimeList = (list) => {
    const seen = new Set();

    return list.filter((anime) => {
      if (!anime?.id) return false;
      if (seen.has(anime.id)) return false;
      seen.add(anime.id);
      return true;
    });
  };

  const hasActiveFilters = typeFilter !== "all" || yearFilter !== "all";

  const allAnime = useMemo(() => {
    const merged = [...popularAnime, ...newAnime];
    return uniqueAnimeList(merged).sort(
      (a, b) => Number(b.score || 0) - Number(a.score || 0)
    );
  }, [popularAnime, newAnime]);

  const allYears = useMemo(() => {
    const years = allAnime
      .map((anime) => anime.year)
      .filter(Boolean)
      .sort((a, b) => b - a);

    return [...new Set(years)];
  }, [allAnime]);

  const filterAnime = (list) => {
    return list.filter((anime) => {
      const typeOk =
        typeFilter === "all" ||
        String(anime.type || "").toLowerCase() === typeFilter.toLowerCase();

      const yearOk =
        yearFilter === "all" || String(anime.year || "") === String(yearFilter);

      return typeOk && yearOk;
    });
  };

  const filteredPopular = filterAnime(popularAnime);
  const filteredNew = filterAnime(newAnime);
  const filteredAllAnime = filterAnime(allAnime);
  const filteredPreviewAnime = filteredAllAnime.slice(0, 20);

  const resetFilters = () => {
    setTypeFilter("all");
    setYearFilter("all");
    setShowAllAnime(false);
    setYearMenuOpen(false);
  };

  const renderAnimeCard = (anime, index = 0) => (
    <div
      key={anime.id}
      className="animate-[cardReveal_.75s_cubic-bezier(.2,.8,.2,1)_forwards] opacity-0"
      style={{ animationDelay: `${Math.min(index * 70, 900)}ms` }}
    >
      <div className="anime-card group relative flex h-[330px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-fuchsia-300/30 hover:shadow-[0_25px_70px_rgba(168,85,247,0.25)] sm:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_45%)] opacity-80"></div>
        <div className="pointer-events-none absolute -left-12 top-10 h-28 w-28 rounded-full bg-pink-400/20 blur-3xl transition duration-700 group-hover:scale-125"></div>

        <div className="relative h-52 overflow-hidden">
          <img
            src={anime.image || "https://placehold.co/400x300?text=Anime"}
            alt={anime.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#090c18] via-[#090c18]/20 to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.05)_30%,transparent_60%)] opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100"></div>

          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {anime.year && (
              <span className="rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[9px] font-medium text-white backdrop-blur-md">
                {anime.year}
              </span>
            )}
            {anime.type && (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-medium text-cyan-200 backdrop-blur-md">
                {anime.type}
              </span>
            )}
          </div>

          {anime.score && (
            <div className="absolute bottom-2 right-2 rounded-full border border-yellow-300/20 bg-yellow-400/10 px-2 py-1 text-[9px] font-semibold text-yellow-200 backdrop-blur-md shadow-lg shadow-yellow-900/20">
              ⭐ {anime.score}
            </div>
          )}
        </div>

        <div className="relative flex flex-1 flex-col p-3">
          <h4 className="line-clamp-2 min-h-[36px] text-[13px] font-bold leading-5 text-white transition group-hover:text-pink-300">
            {anime.title}
          </h4>

          <p className="mt-1 line-clamp-1 text-[10px] text-slate-300">
            {anime.genre || "Без жанра"}
          </p>

          <div className="mt-2">
            {anime.episodes ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] text-white/85">
                {anime.episodes} эп.
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-[10px] text-white/40">
                Нет данных
              </span>
            )}
          </div>

          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={() => openAnimePage(anime)}
              className="block w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-3 py-2.5 text-center text-[11px] font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition duration-300 hover:scale-[1.02]"
            >
              Смотреть
            </button>
          </div>
        </div>
      </div>

      <div className="anime-card group relative hidden h-[360px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.07))] shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition duration-500 hover:-translate-y-3 hover:border-fuchsia-300/30 hover:shadow-[0_30px_80px_rgba(168,85,247,0.28)] sm:flex lg:h-[440px] xl:h-[515px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_35%)] opacity-90"></div>
        <div className="pointer-events-none absolute -right-16 top-10 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl transition duration-700 group-hover:scale-125"></div>

        <div className="relative h-48 overflow-hidden lg:h-60 xl:h-76">
          <img
            src={anime.image || "https://placehold.co/400x300?text=Anime"}
            alt={anime.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_10%,rgba(255,255,255,0.14)_35%,transparent_60%)] -translate-x-full transition duration-[1200ms] group-hover:translate-x-full"></div>

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
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

        <div className="relative flex flex-1 flex-col p-4 lg:p-5">
          <h4 className="line-clamp-2 min-h-[46px] text-base font-bold leading-6 text-white transition group-hover:text-pink-300 lg:min-h-[50px] lg:text-lg xl:min-h-[56px] xl:text-xl xl:leading-7">
            {anime.title}
          </h4>

          <p className="mt-2 line-clamp-1 min-h-[18px] text-xs text-slate-300 lg:text-sm">
            {anime.genre || "Без жанра"}
          </p>

          <div className="mt-3 min-h-[28px]">
            {anime.episodes ? (
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                {anime.episodes} эп.
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                Нет данных
              </span>
            )}
          </div>

          <div className="mt-auto pt-4 lg:pt-5">
            <button
              type="button"
              onClick={() => openAnimePage(anime)}
              className="block w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition duration-300 hover:scale-[1.02]"
            >
              Смотреть
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmpty = (text) => (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-5 py-12 text-center backdrop-blur-xl sm:rounded-[30px] sm:px-8 sm:py-16">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl sm:h-16 sm:w-16 sm:text-3xl">
        🎴
      </div>
      <h4 className="text-xl font-bold text-white sm:text-2xl">Пока пусто</h4>
      <p className="mt-2 text-sm text-slate-300">{text}</p>
    </div>
  );

  const FloatingPetals = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
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
      {Array.from({ length: 34 }).map((_, i) => (
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

  return (
    <>
      <style>{`
        @keyframes cardReveal {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes floatSoft {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(-1deg);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        @keyframes petalFall {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.95;
          }
          50% {
            transform: translate3d(60px, 50vh, 0) rotate(160deg);
          }
          100% {
            transform: translate3d(-50px, 115vh, 0) rotate(320deg);
            opacity: 0;
          }
        }

        @keyframes meshMove {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          33% {
            transform: translate3d(30px, -25px, 0) scale(1.08);
          }
          66% {
            transform: translate3d(-20px, 20px, 0) scale(0.96);
          }
        }

        @keyframes heroGlow {
          0%, 100% {
            transform: translateY(0px);
            filter: saturate(1);
          }
          50% {
            transform: translateY(-6px);
            filter: saturate(1.18);
          }
        }

        @keyframes yearMenuIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .anime-card::before {
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

        .anime-card:hover::before {
          opacity: 1;
        }

        .year-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .year-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 999px;
        }

        .year-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(34,211,238,0.65), rgba(168,85,247,0.7));
          border-radius: 999px;
        }
      `}</style>

      <div className="relative min-h-screen w-full overflow-hidden bg-[#060816] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom,rgba(244,114,182,0.16),transparent_34%),linear-gradient(180deg,#050816_0%,#0c1330_45%,#190f36_100%)]"></div>

        <div className="pointer-events-none absolute -left-24 top-0 h-[22rem] w-[22rem] rounded-full bg-pink-500/20 blur-3xl" style={{ animation: "meshMove 13s ease-in-out infinite" }}></div>
        <div className="pointer-events-none absolute right-[-6rem] top-[8%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/20 blur-3xl" style={{ animation: "meshMove 16s ease-in-out infinite reverse" }}></div>
        <div className="pointer-events-none absolute bottom-[-5rem] left-[24%] h-[20rem] w-[20rem] rounded-full bg-violet-500/20 blur-3xl" style={{ animation: "meshMove 14s ease-in-out infinite" }}></div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent)]"></div>

        <Stars />
        <FloatingPetals />

        <section className="relative z-10 px-3 pb-6 pt-4 sm:hidden">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/10 p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl animate-[cardReveal_.7s_ease_forwards]">
            <div className="relative overflow-hidden rounded-[24px]" style={{ animation: "floatSoft 6s ease-in-out infinite" }}>
              <img
                src="https://i.pinimg.com/736x/cf/63/74/cf6374c49c0b923967f5b9d6b6d0da83.jpg"
                alt="anime banner"
                className="h-[200px] w-full object-cover"
                style={{ animation: "heroGlow 7s ease-in-out infinite" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b18] via-[#070b18]/30 to-transparent"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_42%)]"></div>
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-pink-400/20 blur-2xl" style={{ animation: "glowPulse 3s ease-in-out infinite" }}></div>
              <div className="absolute left-[-10px] bottom-8 h-16 w-16 rounded-full bg-cyan-400/20 blur-2xl" style={{ animation: "glowPulse 4s ease-in-out infinite" }}></div>

              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="inline-flex rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1 text-[10px] text-pink-200 backdrop-blur-md">
                  Anime Streaming Platform
                </div>

                <h2 className="mt-3 text-2xl font-extrabold leading-tight">
                  Мир
                  <span className="block bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                    любимого аниме
                  </span>
                </h2>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center backdrop-blur-md">
                <p className="text-lg font-bold text-pink-300">{popularAnime.length}</p>
                <p className="text-[10px] text-slate-300">Популярное</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center backdrop-blur-md">
                <p className="text-lg font-bold text-cyan-300">{newAnime.length}</p>
                <p className="text-[10px] text-slate-300">Новое</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center backdrop-blur-md">
                <p className="text-lg font-bold text-violet-300">{allAnime.length}</p>
                <p className="text-[10px] text-slate-300">Всего</p>
              </div>
            </div>

            <p className="mt-4 px-1 text-sm leading-7 text-slate-200">
              Смотри популярные тайтлы, находи новые истории и наслаждайся атмосферой GarGaLib в ярком анимешном стиле.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                to="/animes"
                className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-4 py-3 text-center text-xs font-semibold text-white shadow-xl shadow-fuchsia-900/30 transition duration-300 active:scale-[0.98]"
              >
                Каталог
              </Link>

              {isAdmin ? (
                <Link
                  to="/upload"
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs font-semibold text-white transition duration-300 active:scale-[0.98]"
                >
                  Добавить
                </Link>
              ) : (
                <button
                  type="button"
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs font-semibold text-white/70"
                >
                  GarGaLib
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto hidden max-w-7xl px-6 pb-12 pt-14 sm:block">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-[cardReveal_.8s_ease_forwards]">
              <span className="inline-block rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-sm text-pink-200 backdrop-blur-md">
                Anime Streaming Platform
              </span>

              <h2 className="mt-6 text-5xl font-extrabold leading-tight sm:text-6xl xl:text-7xl">
                Открой для себя мир
                <span className="block bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  любимого аниме
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
                Смотри популярные тайтлы, находи новые истории и наслаждайся атмосферой GarGaLib в очень красивом анимешном интерфейсе с мягкими свечениями и живым фоном.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/animes"
                  className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-7 py-4 font-semibold text-white shadow-2xl shadow-fuchsia-900/40 transition duration-300 hover:scale-105"
                >
                  Смотреть каталог
                </Link>

                {isAdmin && (
                  <Link
                    to="/upload"
                    className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur-md transition duration-300 hover:scale-105 hover:bg-white/15"
                  >
                    Добавить аниме
                  </Link>
                )}
              </div>
            </div>

            <div className="animate-[cardReveal_.95s_ease_forwards] rounded-[34px] border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/40">
                <img
                  src="https://i.pinimg.com/736x/cf/63/74/cf6374c49c0b923967f5b9d6b6d0da83.jpg"
                  alt="anime banner"
                  className="h-[460px] w-full object-cover"
                  style={{ animation: "heroGlow 8s ease-in-out infinite" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b18]/70 via-transparent to-transparent"></div>
                <div className="absolute -right-8 top-6 h-36 w-36 rounded-full bg-pink-400/20 blur-3xl" style={{ animation: "glowPulse 4s ease-in-out infinite" }}></div>
                <div className="absolute left-6 bottom-6 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl" style={{ animation: "glowPulse 5s ease-in-out infinite" }}></div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md">
                  <p className="text-2xl font-bold text-pink-300">{popularAnime.length}</p>
                  <p className="text-sm text-slate-300">Популярное</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md">
                  <p className="text-2xl font-bold text-cyan-300">{newAnime.length}</p>
                  <p className="text-sm text-slate-300">Новое</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md">
                  <p className="text-2xl font-bold text-violet-300">{allAnime.length}</p>
                  <p className="text-sm text-slate-300">Всего</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-[120] mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
          <div className="relative overflow-visible rounded-[26px] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:rounded-[34px] sm:p-6">
            <div className="mb-5">
              <h3 className="text-2xl font-bold text-white sm:text-3xl">Фильтр</h3>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Выберите тип и год выпуска.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.6fr_1.4fr_auto]">
              <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 sm:rounded-[26px] sm:p-4">
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/40 sm:text-xs">
                  Тип аниме
                </p>

                <div className="flex flex-wrap gap-2">
                  {["all", "TV", "Movie", "OVA", "ONA", "Special"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`rounded-full px-3 py-2 text-xs font-medium transition sm:px-4 sm:py-2.5 sm:text-sm ${
                        typeFilter === type
                          ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-900/30"
                          : "border border-white/10 bg-white/10 text-slate-200 hover:bg-white/15"
                      }`}
                    >
                      {type === "all" ? "Все" : type}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={yearMenuRef}
                className="relative z-[200] rounded-[20px] border border-white/10 bg-black/20 p-3 sm:rounded-[26px] sm:p-4"
              >
                <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/40 sm:text-xs">
                  Год выпуска
                </p>

                <button
                  onClick={() => setYearMenuOpen((prev) => !prev)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium text-white transition ${
                    yearMenuOpen
                      ? "border-cyan-300/30 bg-white/15 shadow-[0_0_0_4px_rgba(34,211,238,0.08)]"
                      : "border-white/10 bg-white/10 hover:bg-white/15"
                  }`}
                >
                  <span>{yearFilter === "all" ? "Все годы" : yearFilter}</span>
                  <span
                    className={`transition duration-300 ${
                      yearMenuOpen ? "rotate-180 text-cyan-200" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {yearMenuOpen && (
                  <div
                    className="year-scroll absolute left-0 right-0 top-[94px] z-[300] max-h-80 overflow-y-auto rounded-[24px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(13,18,38,0.98),rgba(20,24,52,0.96))] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:top-[108px]"
                    style={{ animation: "yearMenuIn .22s ease forwards" }}
                  >
                    <div className="mb-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
                        Выберите год
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setYearFilter("all");
                        setYearMenuOpen(false);
                      }}
                      className={`mb-1 block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                        yearFilter === "all"
                          ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500 text-white shadow-lg shadow-cyan-900/25"
                          : "text-white hover:bg-white/10"
                      }`}
                    >
                      Все годы
                    </button>

                    {allYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => {
                          setYearFilter(String(year));
                          setYearMenuOpen(false);
                        }}
                        className={`mb-1 block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                          String(yearFilter) === String(year)
                            ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500 text-white shadow-lg shadow-cyan-900/25"
                            : "text-white hover:bg-white/10"
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 lg:w-auto"
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-0 isolate">
          {hasActiveFilters ? (
            <section className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-10">
              <div className="mb-6 flex items-center justify-between sm:mb-8">
                <h3 className="text-2xl font-bold text-white sm:text-3xl">Найдено по фильтру</h3>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 sm:px-4 sm:py-2 sm:text-sm">
                  {filteredAllAnime.length} аниме
                </span>
              </div>

              {loadingPopular || loadingNew ? (
                renderEmpty("Загрузка аниме...")
              ) : filteredPreviewAnime.length === 0 ? (
                renderEmpty("По фильтру ничего не найдено.")
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                  {filteredPreviewAnime.map((anime, index) => renderAnimeCard(anime, index))}
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-10">
                <div className="mb-6 flex items-center justify-between sm:mb-8">
                  <h3 className="text-2xl font-bold text-white sm:text-3xl">Популярное аниме</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 sm:px-4 sm:py-2 sm:text-sm">
                    {filteredPopular.length} аниме
                  </span>
                </div>

                {loadingPopular ? (
                  renderEmpty("Загрузка популярного аниме...")
                ) : errorPopular ? (
                  renderEmpty(errorPopular)
                ) : filteredPopular.length === 0 ? (
                  renderEmpty("По фильтру ничего не найдено.")
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                    {filteredPopular.slice(0, 20).map((anime, index) => renderAnimeCard(anime, index))}
                  </div>
                )}
              </section>

              <section className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-10">
                <div className="mb-6 flex items-center justify-between sm:mb-8">
                  <h3 className="text-2xl font-bold text-white sm:text-3xl">Новое аниме</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 sm:px-4 sm:py-2 sm:text-sm">
                    {filteredNew.length} аниме
                  </span>
                </div>

                {loadingNew ? (
                  renderEmpty("Загрузка нового аниме...")
                ) : errorNew ? (
                  renderEmpty(errorNew)
                ) : filteredNew.length === 0 ? (
                  renderEmpty("По фильтру ничего не найдено.")
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                    {filteredNew.slice(0, 20).map((anime, index) => renderAnimeCard(anime, index))}
                  </div>
                )}
              </section>
            </>
          )}

          <section className="mx-auto max-w-7xl px-3 pb-10 pt-2 sm:px-6 sm:pb-14 sm:pt-4">
            <div className="flex justify-center">
              <button
                onClick={() => setShowAllAnime((prev) => !prev)}
                className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-2xl shadow-fuchsia-900/40 transition duration-300 hover:scale-105 sm:px-8 sm:py-4 sm:text-base"
              >
                {showAllAnime ? "Скрыть список всех аниме" : "Показать список всех аниме"}
              </button>
            </div>
          </section>

          {showAllAnime && (
            <section className="mx-auto max-w-7xl px-3 pb-12 pt-2 sm:px-6 sm:pb-16">
              <div className="mb-6 flex items-center justify-between sm:mb-8">
                <h3 className="text-2xl font-bold text-white sm:text-3xl">Все аниме</h3>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 sm:px-4 sm:py-2 sm:text-sm">
                  {filteredAllAnime.length} аниме
                </span>
              </div>

              {filteredAllAnime.length === 0 ? (
                renderEmpty("По фильтру ничего не найдено.")
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                  {filteredAllAnime.map((anime, index) => renderAnimeCard(anime, index))}
                </div>
              )}
            </section>
          )}
        </section>
      </div>
    </>
  );
};

export default Home;