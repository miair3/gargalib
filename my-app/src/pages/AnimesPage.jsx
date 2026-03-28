import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://gargalib-backend.onrender.com";

const STAR_PRESETS = Array.from({ length: 130 }).map((_, i) => ({
  left: `${2 + ((i * 37) % 96)}%`,
  top: `${2 + ((i * 29) % 94)}%`,
  size: 0.8 + ((i * 7) % 16) / 10,
  duration: `${9 + (i % 12) * 1.5}s`,
  delay: `${(i % 19) * 0.8}s`,
  peak: 0.35 + ((i * 11) % 50) / 100,
}));

const COMET_PRESETS = [
  { top: "8%", left: "4%", width: 210, delay: "2s", duration: "14s", rotate: "28deg" },
  { top: "18%", left: "12%", width: 180, delay: "11s", duration: "18s", rotate: "32deg" },
  { top: "30%", left: "7%", width: 200, delay: "21s", duration: "20s", rotate: "24deg" },
  { top: "50%", left: "10%", width: 170, delay: "30s", duration: "22s", rotate: "30deg" },
];

const TYPE_OPTIONS = ["all", "TV", "Movie", "OVA", "ONA", "Special"];

const sortOptions = [
  { value: "rating", label: "По рейтингу" },
  { value: "year", label: "По году" },
  { value: "title", label: "По названию" },
];

const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const uniqueAnimeList = (list = []) => {
  const seen = new Set();

  return list.filter((anime) => {
    const id = String(anime?.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getScoreClass = (score) => {
  const num = Number(score || 0);
  if (num >= 8.5) return "from-emerald-300 via-lime-300 to-green-400 text-black";
  if (num >= 7) return "from-yellow-300 via-orange-300 to-amber-400 text-black";
  return "from-pink-400 via-rose-400 to-red-400 text-white";
};

const Stars = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {STAR_PRESETS.map((star, i) => (
      <span
        key={`star-${i}`}
        className="absolute block rounded-full bg-white"
        style={{
          left: star.left,
          top: star.top,
          width: `${star.size}px`,
          height: `${star.size}px`,
          opacity: 0,
          boxShadow:
            star.size > 1.8
              ? "0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(140,200,255,0.45)"
              : "0 0 7px rgba(255,255,255,0.82)",
          animation: `randomStarBlink ${star.duration} linear ${star.delay} infinite`,
          "--star-peak": star.peak,
        }}
      />
    ))}

    {COMET_PRESETS.map((comet, i) => (
      <span
        key={`comet-${i}`}
        className="absolute block"
        style={{
          top: comet.top,
          left: comet.left,
          width: `${comet.width}px`,
          height: "2px",
          opacity: 0,
          borderRadius: "999px",
          transform: `rotate(${comet.rotate})`,
          "--comet-rotate": comet.rotate,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.18), rgba(255,255,255,1), rgba(173,216,255,0.78), rgba(255,255,255,0))",
          filter: "drop-shadow(0 0 10px rgba(255,255,255,0.8))",
          animation: `cometFly ${comet.duration} linear ${comet.delay} infinite`,
        }}
      >
        <span
          className="absolute right-0 top-1/2 block h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-white"
          style={{
            boxShadow:
              "0 0 14px rgba(255,255,255,1), 0 0 24px rgba(120,190,255,0.6)",
          }}
        />
      </span>
    ))}
  </div>
);

const StatCard = ({ value, label, glow }) => (
  <div
    className={`rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-center backdrop-blur-md shadow-lg shadow-black/20 ${glow}`}
  >
    <p className="text-2xl font-extrabold text-white">{value}</p>
    <p className="mt-1 text-xs text-slate-400 sm:text-sm">{label}</p>
  </div>
);

const SearchInput = ({ value, onChange }) => (
  <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 sm:text-xs">
        Поиск
      </p>
      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-300">
        Search
      </span>
    </div>

    <div className="relative mt-3">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Naruto, Bleach, One Piece..."
        className="w-full rounded-[20px] border border-white/10 bg-[#08101d]/80 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-300/35 focus:shadow-[0_0_0_4px_rgba(96,165,250,0.08)]"
      />
    </div>
  </div>
);

const FancyDropdown = ({ label, badge, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activeLabel =
    options.find((item) => item.value === value)?.label || "Выбрать";

  return (
    <div
      ref={wrapRef}
      className={`relative ${
        open ? "z-[999]" : "z-20"
      } rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.18)]`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 sm:text-xs">
          {label}
        </p>
        <span className="rounded-full bg-violet-400/10 px-2 py-1 text-[10px] text-violet-200">
          {badge}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`mt-3 flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left text-sm font-semibold text-white transition ${
          open
            ? "border-fuchsia-300/30 bg-white/10 shadow-[0_0_0_4px_rgba(217,70,239,0.08)]"
            : "border-white/10 bg-[#08101d]/80 hover:bg-[#0b1424]"
        }`}
      >
        <span>{activeLabel}</span>
        <span
          className={`text-slate-300 transition duration-300 ${
            open ? "rotate-180 text-fuchsia-200" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[1000] rounded-[24px] border border-fuchsia-300/20 bg-[rgba(8,12,24,0.98)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.62)] backdrop-blur-2xl animate-[dropdownIn_.22s_ease]">
          <div className="pretty-scroll max-h-64 overflow-y-auto pr-1">
            {options.map((item) => {
              const active = item.value === value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`mb-1 block w-full rounded-[18px] px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-900/30"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {active ? "✓ " : ""}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const TypeButtons = ({ value, onChange }) => (
  <div className="relative z-10 rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.18)] lg:col-span-4">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 sm:text-xs">
        Тип аниме
      </p>
      <span className="rounded-full bg-fuchsia-400/10 px-2 py-1 text-[10px] text-fuchsia-200">
        Type
      </span>
    </div>

    <div className="flex flex-wrap gap-2">
      {TYPE_OPTIONS.map((type) => {
        const active = value === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-900/30"
                : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            {type === "all" ? "Все" : type}
          </button>
        );
      })}
    </div>
  </div>
);

const AnimeCard = ({ anime, index, onOpen }) => (
  <div
    className="animate-[cardReveal_.7s_cubic-bezier(.2,.8,.2,1)_forwards] opacity-0"
    style={{ animationDelay: `${Math.min(index * 55, 850)}ms` }}
  >
    <div className="anime-card group relative flex h-[360px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,24,0.52),rgba(8,12,24,0.30))] shadow-[0_18px_45px_rgba(0,0,0,0.30)] backdrop-blur-md transition duration-500 hover:-translate-y-2 hover:border-fuchsia-300/25 sm:h-[430px] xl:h-[500px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.08),transparent_35%)]"></div>

      <div className="relative h-52 overflow-hidden sm:h-64 xl:h-72">
        <img
          src={anime.image || "https://placehold.co/600x900?text=Anime"}
          alt={anime.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-black/10 to-transparent"></div>

        <div className="absolute left-3 top-3 flex max-w-[86%] flex-wrap gap-2">
          {anime.year && (
            <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-white backdrop-blur-md">
              {anime.year}
            </span>
          )}
          {anime.type && (
            <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 backdrop-blur-md">
              {anime.type}
            </span>
          )}
        </div>

        {anime.score ? (
          <div
            className={`absolute bottom-3 right-3 rounded-full bg-gradient-to-r ${getScoreClass(
              anime.score
            )} px-3 py-1.5 text-xs font-black shadow-lg`}
          >
            ★ {anime.score}
          </div>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <h3
          className="min-h-[48px] text-base font-bold leading-6 text-white transition group-hover:text-pink-300 sm:min-h-[56px] sm:text-lg xl:text-xl"
          style={clampStyle(2)}
        >
          {anime.title}
        </h3>

        <p
          className="mt-2 min-h-[20px] text-xs text-slate-300 sm:text-sm"
          style={clampStyle(1)}
        >
          {anime.genre || "Жанр не указан"}
        </p>

        <div className="mt-3 flex items-center gap-2">
          {anime.episodes ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/85">
              {anime.episodes} эп.
            </span>
          ) : (
            <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/50">
              Anime
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={() => onOpen(anime)}
            className="block w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:scale-[1.02]"
          >
            Смотреть тайтл
          </button>
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-[28px] border border-white/10 bg-black/20 px-5 py-14 text-center backdrop-blur-md sm:px-8 sm:py-16">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl sm:h-16 sm:w-16 sm:text-3xl">
      🎴
    </div>
    <h4 className="text-xl font-bold text-white sm:text-2xl">Пока пусто</h4>
    <p className="mt-2 text-sm text-slate-300">{text}</p>
  </div>
);

const SectionShell = ({ title, subtitle, rightText, children }) => (
  <section className="relative z-10 mx-auto max-w-7xl px-3 pb-10 pt-2 sm:px-6 sm:pb-14">
    <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 backdrop-blur-sm sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold text-white sm:text-3xl">{title}</h3>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          {rightText}
        </span>
      </div>
      {children}
    </div>
  </section>
);

const AnimesPage = () => {
  const navigate = useNavigate();

  const [popularAnime, setPopularAnime] = useState([]);
  const [newAnime, setNewAnime] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/anime/home-feed`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.message || "Не удалось загрузить каталог");
          setPopularAnime([]);
          setNewAnime([]);
          return;
        }

        setPopularAnime(Array.isArray(data?.popularAnime) ? data.popularAnime : []);
        setNewAnime(Array.isArray(data?.newAnime) ? data.newAnime : []);
      } catch (err) {
        console.log("CATALOG ERROR:", err);
        setError("Не удалось загрузить каталог");
        setPopularAnime([]);
        setNewAnime([]);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);

        const res = await fetch(
          `${API_BASE}/api/anime/search?q=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal }
        );

        const data = await res.json();

        if (!res.ok) {
          setSearchResults([]);
          return;
        }

        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.log("SEARCH ERROR:", err);
          setSearchResults([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

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

  const baseCatalog = useMemo(() => {
    return uniqueAnimeList([...popularAnime, ...newAnime]);
  }, [popularAnime, newAnime]);

  const sourceList = useMemo(() => {
    return search.trim() ? uniqueAnimeList(searchResults) : baseCatalog;
  }, [search, searchResults, baseCatalog]);

  const allYears = useMemo(() => {
    const years = sourceList
      .map((anime) => Number(anime?.year))
      .filter((year) => !Number.isNaN(year))
      .sort((a, b) => b - a);

    return [...new Set(years)];
  }, [sourceList]);

  const filteredAndSorted = useMemo(() => {
    const filtered = sourceList.filter((anime) => {
      const matchType =
        typeFilter === "all" ||
        String(anime?.type || "").toLowerCase() === typeFilter.toLowerCase();

      const matchYear =
        yearFilter === "all" ||
        String(anime?.year || "") === String(yearFilter);

      return matchType && matchYear;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "rating") return Number(b?.score || 0) - Number(a?.score || 0);
      if (sortBy === "year") return Number(b?.year || 0) - Number(a?.year || 0);
      if (sortBy === "title") {
        return String(a?.title || "").localeCompare(String(b?.title || ""), "ru");
      }
      return 0;
    });
  }, [sourceList, typeFilter, yearFilter, sortBy]);

  const topRatedAnime = useMemo(() => {
    return [...baseCatalog]
      .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))
      .slice(0, 6);
  }, [baseCatalog]);

  const stats = useMemo(() => {
    const years = baseCatalog
      .map((anime) => Number(anime?.year))
      .filter((year) => !Number.isNaN(year));

    return {
      all: baseCatalog.length,
      total: filteredAndSorted.length,
      newestYear: years.length ? Math.max(...years) : "—",
      topScore: topRatedAnime[0]?.score || "—",
    };
  }, [baseCatalog, filteredAndSorted.length, topRatedAnime]);

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setYearFilter("all");
    setSortBy("rating");
    setSearchResults([]);
  };

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

        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes randomStarBlink {
          0% {
            opacity: 0;
            transform: scale(0.6);
            filter: brightness(0.7);
          }
          10% {
            opacity: calc(var(--star-peak) * 0.12);
            transform: scale(0.8);
          }
          20% {
            opacity: calc(var(--star-peak) * 0.95);
            transform: scale(1.12);
            filter: brightness(1.22);
          }
          32% {
            opacity: calc(var(--star-peak) * 0.25);
            transform: scale(0.9);
          }
          45% {
            opacity: 0;
            transform: scale(0.7);
          }
          60% {
            opacity: calc(var(--star-peak) * 0.18);
            transform: scale(0.86);
          }
          74% {
            opacity: calc(var(--star-peak) * 1);
            transform: scale(1.25);
            filter: brightness(1.35);
          }
          86% {
            opacity: calc(var(--star-peak) * 0.35);
            transform: scale(0.95);
          }
          100% {
            opacity: 0;
            transform: scale(0.65);
          }
        }

        @keyframes cometFly {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(var(--comet-rotate)) scaleX(0.7);
          }
          5% {
            opacity: 0.2;
          }
          10% {
            opacity: 1;
          }
          22% {
            opacity: 0.95;
          }
          36% {
            opacity: 0;
            transform: translate3d(420px, 250px, 0) rotate(var(--comet-rotate)) scaleX(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(420px, 250px, 0) rotate(var(--comet-rotate)) scaleX(1);
          }
        }

        @keyframes meshMove {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          33% {
            transform: translate3d(24px, -20px, 0) scale(1.05);
          }
          66% {
            transform: translate3d(-18px, 18px, 0) scale(0.97);
          }
        }

        @keyframes heroGlow {
          0%, 100% {
            transform: translateY(0px);
            filter: saturate(0.95) brightness(0.82);
          }
          50% {
            transform: translateY(-6px);
            filter: saturate(1.05) brightness(0.9);
          }
        }

        .pretty-scroll::-webkit-scrollbar {
          width: 12px;
        }

        .pretty-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.04);
          border-radius: 999px;
        }

        .pretty-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(34,211,238,1),
            rgba(168,85,247,1),
            rgba(244,114,182,1)
          );
          border-radius: 999px;
          box-shadow:
            0 0 16px rgba(34,211,238,0.55),
            0 0 22px rgba(168,85,247,0.45),
            0 0 30px rgba(244,114,182,0.35);
        }

        .pretty-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(125,211,252,1),
            rgba(196,181,253,1),
            rgba(251,113,133,1)
          );
        }

        .anime-card::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(244,114,182,0.18), rgba(34,211,238,0.12), rgba(168,85,247,0.18));
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
      `}</style>

      <div className="relative min-h-screen w-full overflow-hidden text-white">
        <div className="fixed inset-0 -z-10 bg-[#02040b]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(60,90,180,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(30,50,95,0.14),transparent_20%),radial-gradient(circle_at_bottom,rgba(70,30,110,0.12),transparent_26%),linear-gradient(180deg,#01030a_0%,#020611_18%,#040b18_38%,#050d1c_58%,#060814_78%,#01030a_100%)]"></div>

          <div
            className="pointer-events-none absolute -left-24 top-0 h-[22rem] w-[22rem] rounded-full bg-blue-900/20 blur-3xl"
            style={{ animation: "meshMove 13s ease-in-out infinite" }}
          />
          <div
            className="pointer-events-none absolute right-[-6rem] top-[8%] h-[24rem] w-[24rem] rounded-full bg-slate-700/15 blur-3xl"
            style={{ animation: "meshMove 16s ease-in-out infinite reverse" }}
          />
          <div
            className="pointer-events-none absolute bottom-[-5rem] left-[24%] h-[20rem] w-[20rem] rounded-full bg-violet-950/20 blur-3xl"
            style={{ animation: "meshMove 14s ease-in-out infinite" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:90px_90px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.45),transparent)]"></div>

          <Stars />
        </div>

        <section className="relative z-10 mx-auto max-w-7xl px-3 pb-6 pt-4 sm:px-6 sm:pb-10 sm:pt-12">
          <div className="grid items-center gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-black/15 p-4 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-6">
              <div className="inline-flex rounded-full border border-slate-400/20 bg-slate-400/10 px-4 py-2 text-xs text-slate-200 backdrop-blur-md sm:text-sm">
                Anime Catalog • GarGaLib
              </div>

              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl xl:text-6xl">
                Мир аниме
                <span className="block bg-gradient-to-r from-slate-100 via-blue-200 to-violet-300 bg-clip-text text-transparent">
                  лучшие тайтлы и новые истории
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                Открывай популярные аниме, находи новые релизы и выбирай, что смотреть дальше.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard value={stats.all} label="Аниме в каталоге" glow="shadow-blue-950/20" />
                <StatCard value={stats.total} label="Найдено сейчас" glow="shadow-cyan-950/20" />
                <StatCard value={stats.topScore} label="Лучший рейтинг" glow="shadow-yellow-950/20" />
                <StatCard value={stats.newestYear} label="Свежий год" glow="shadow-violet-950/20" />
              </div>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-black/15 p-4 shadow-2xl shadow-black/30 backdrop-blur-md">
              <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/40">
                <img
                  src="https://rozetked.me/images/uploads/5mVu2BC9XLcV.jpg"
                  alt="anime background"
                  className="h-[280px] w-full object-cover sm:h-[420px]"
                  style={{ animation: "heroGlow 8s ease-in-out infinite" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040b]/90 via-[#02040b]/40 to-[#02040b]/10"></div>

                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                      Anime Collection
                    </p>
                    <h3 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                      Топ, новинки и классика
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      Собирай свою подборку и находи тайтлы под любое настроение.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-[500] mx-auto max-w-7xl overflow-visible px-3 py-4 sm:px-6 sm:py-6">
          <div className="overflow-visible rounded-[34px] border border-white/10 bg-black/15 p-4 backdrop-blur-md sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Фильтры каталога</h2>
              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                Ищи по названию, выбирай тип, год и сортируй список как удобно.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />

              <FancyDropdown
                label="Год"
                badge="Year"
                value={yearFilter}
                onChange={setYearFilter}
                options={[
                  { value: "all", label: "Все годы" },
                  ...allYears.map((year) => ({ value: String(year), label: String(year) })),
                ]}
              />

              <FancyDropdown
                label="Сортировка"
                badge="Sort"
                value={sortBy}
                onChange={setSortBy}
                options={sortOptions}
              />

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 sm:text-xs">
                    Действия
                  </p>
                  <span className="rounded-full bg-pink-400/10 px-2 py-1 text-[10px] text-pink-200">
                    Reset
                  </span>
                </div>

                <button
                  onClick={resetFilters}
                  className="mt-3 w-full rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Сбросить всё
                </button>

                {searchLoading ? (
                  <div className="mt-3 rounded-[20px] border border-blue-300/15 bg-blue-400/10 px-4 py-3 text-sm text-blue-200">
                    Идёт поиск...
                  </div>
                ) : (
                  <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    Найдено:
                    <span className="ml-2 font-extrabold text-white">
                      {filteredAndSorted.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 relative z-10">
              <TypeButtons value={typeFilter} onChange={setTypeFilter} />
            </div>
          </div>
        </section>

        {!search.trim() && topRatedAnime.length > 0 ? (
          <SectionShell
            title="Топ подборка"
            subtitle="Самые популярные и высокооценённые аниме"
            rightText={`${topRatedAnime.length} тайтлов`}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
              {topRatedAnime.map((anime, index) => (
                <button
                  key={anime.id}
                  onClick={() => openAnimePage(anime)}
                  className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-black/20 text-left shadow-xl shadow-black/20 backdrop-blur-md transition hover:-translate-y-1 hover:border-violet-300/20"
                >
                  <img
                    src={anime.image || "https://placehold.co/400x600?text=Anime"}
                    alt={anime.title}
                    className="h-52 w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#02040b] via-[#02040b]/20 to-transparent" />
                  <div className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
                    TOP {index + 1}
                  </div>
                  <div className="relative p-3">
                    <div className="text-sm font-extrabold text-white" style={clampStyle(2)}>
                      {anime.title}
                    </div>
                    <div className="mt-2 text-xs text-slate-300">
                      ★ {anime.score || "—"} {anime.year ? `• ${anime.year}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </SectionShell>
        ) : null}

        <SectionShell
          title="Каталог аниме"
          subtitle="Смотри, выбирай и открывай новые истории"
          rightText={`${filteredAndSorted.length} аниме`}
        >
          {loading ? (
            <EmptyState text="Загрузка каталога..." />
          ) : error ? (
            <EmptyState text={error} />
          ) : filteredAndSorted.length === 0 ? (
            <EmptyState text="По фильтру ничего не найдено." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {filteredAndSorted.map((anime, index) => (
                <AnimeCard
                  key={`${anime.id}-${index}`}
                  anime={anime}
                  index={index}
                  onOpen={openAnimePage}
                />
              ))}
            </div>
          )}
        </SectionShell>
      </div>
    </>
  );
};

export default AnimesPage;