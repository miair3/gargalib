import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

const Upload = () => {
  const navigate = useNavigate();
  const [type, setType] = useState("anime");
  const [submitting, setSubmitting] = useState(false);

  const [anime, setAnime] = useState({
    title: "",
    genre: "",
    episodes: "",
    description: "",
    year: "",
    image: "",
    banner: "",
  });

  const [posterError, setPosterError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnime((prev) => ({ ...prev, [name]: value }));

    if (name === "image") setPosterError(false);
    if (name === "banner") setBannerError(false);
  };

  const handleTypeChange = (nextType) => {
    setType(nextType);

    if (nextType === "movie") {
      setAnime((prev) => ({
        ...prev,
        episodes: "",
      }));
    }
  };

  const completion = useMemo(() => {
    const fields = [
      anime.title,
      anime.genre,
      anime.description,
      anime.year,
      anime.image,
      anime.banner,
      type === "anime" ? anime.episodes : "ok",
    ];

    const filled = fields.filter((item) => String(item || "").trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [anime, type]);

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  };

  const isValidUrl = (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    const user = getCurrentUser();
    const userId = user?.id || user?._id;

    if (!userId) {
      alert("Сначала войди в аккаунт");
      return;
    }

    if (!anime.title.trim() || !anime.genre.trim() || !anime.description.trim() || !anime.year.trim()) {
      alert("Заполни основные поля");
      return;
    }

    if (!/^\d{4}$/.test(anime.year.trim())) {
      alert("Год должен быть в формате YYYY");
      return;
    }

    if (type === "anime" && !anime.episodes.trim()) {
      alert("Укажи количество серий");
      return;
    }

    if (type === "anime" && Number.isNaN(Number(anime.episodes))) {
      alert("Количество серий должно быть числом");
      return;
    }

    if (anime.image.trim() && !isValidUrl(anime.image.trim())) {
      alert("Ссылка на постер некорректная");
      return;
    }

    if (anime.banner.trim() && !isValidUrl(anime.banner.trim())) {
      alert("Ссылка на баннер некорректная");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: anime.title.trim(),
        genre: anime.genre.trim(),
        description: anime.description.trim(),
        year: Number(anime.year),
        image: anime.image.trim(),
        banner: anime.banner.trim(),
        type,
        userId,
      };

      if (type === "anime") {
        payload.episodes = Number(anime.episodes);
      }

      const res = await fetch(`${API_BASE}/api/anime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.message || data?.error || "Ошибка публикации");
        return;
      }

      alert("Контент успешно опубликован");
      navigate("/home");
    } catch (error) {
      console.log("UPLOAD ERROR:", error);
      alert("Ошибка публикации");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes glowFloat {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .45; }
          50% { transform: translate3d(18px,-16px,0) scale(1.08); opacity: .72; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: .22; transform: scale(.8); }
          50% { opacity: .95; transform: scale(1.25); }
        }
        @keyframes cometSweep {
          0% { transform: translate3d(0,0,0) scale(.94); opacity: 0; }
          10% { opacity: .95; }
          55% { opacity: .8; }
          100% { transform: translate3d(-360px,190px,0) scale(1.02); opacity: 0; }
        }
        @keyframes auroraFlow {
          0%, 100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); opacity: .24; }
          33% { transform: translate3d(34px,-12px,0) scale(1.08) rotate(4deg); opacity: .42; }
          66% { transform: translate3d(-20px,14px,0) scale(.96) rotate(-3deg); opacity: .3; }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(24px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes beamMove {
          0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
          22% { opacity: .18; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }
        .glass-card::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255,255,255,.14), rgba(255,255,255,.03), rgba(244,114,182,.18), rgba(34,211,238,.16));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>

      <div className="relative min-h-screen overflow-hidden bg-[#050714] text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.22),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.16),transparent_36%),linear-gradient(180deg,#040611_0%,#090f1d_32%,#0d1431_64%,#180d34_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
          <div className="absolute -left-8 top-8 h-72 w-72 rounded-full bg-pink-500/18 blur-3xl" style={{ animation: "glowFloat 14s ease-in-out infinite" }} />
          <div className="absolute right-0 top-14 h-80 w-80 rounded-full bg-cyan-400/18 blur-3xl" style={{ animation: "glowFloat 17s ease-in-out infinite reverse" }} />
          <div className="absolute bottom-[-20px] left-1/3 h-80 w-80 rounded-full bg-violet-500/18 blur-3xl" style={{ animation: "glowFloat 15s ease-in-out infinite" }} />

          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={`star-${i}`}
              className="absolute block rounded-full bg-white"
              style={{
                width: `${(i % 3) + 2}px`,
                height: `${(i % 3) + 2}px`,
                left: `${(i * 11) % 100}%`,
                top: `${(i * 17) % 100}%`,
                boxShadow: "0 0 12px rgba(255,255,255,0.85)",
                animation: `twinkle ${2.4 + (i % 4)}s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="glass-card relative mb-8 overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8" style={{ animation: "panelIn .65s ease forwards" }}>
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-pink-400/70 via-white/70 to-cyan-300/70" />
            <div className="absolute inset-y-0 -left-1/4 w-1/4 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: "beamMove 11s ease-in-out infinite" }} />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-pink-200">
                  Admin / Owner Studio
                </p>
                <h1 className="mt-3 bg-gradient-to-r from-pink-300 via-fuchsia-200 to-cyan-200 bg-clip-text text-4xl font-black text-transparent sm:text-5xl lg:text-6xl">
                  Публикация аниме
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:w-auto">
                {[
                  { key: "anime", label: "Аниме" },
                  { key: "movie", label: "Фильм" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleTypeChange(item.key)}
                    className={`rounded-2xl px-6 py-4 text-sm font-bold transition duration-300 ${
                      type === item.key
                        ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-xl shadow-fuchsia-900/30 scale-[1.03]"
                        : "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="glass-card relative overflow-hidden rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-2xl" style={{ animation: "panelIn .75s ease forwards" }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Готовность публикации</p>
                  <p className="mt-1 text-xs text-slate-400">Заполни поля и загрузи превью перед публикацией</p>
                </div>
                <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-pink-200">{completion}%</div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>

            <div className="glass-card relative overflow-hidden rounded-[28px] border border-white/10 bg-white/10 p-5 text-center backdrop-blur-2xl" style={{ animation: "panelIn .85s ease forwards" }}>
              <p className="relative text-xs uppercase tracking-[0.28em] text-slate-300">Режим</p>
              <p className="relative mt-2 text-2xl font-black text-white">{type === "anime" ? "Anime" : "Movie"}</p>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="glass-card relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-white">Основная информация</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-200">Название</label>
                  <input
                    name="title"
                    value={anime.title}
                    onChange={handleChange}
                    placeholder="Введите название"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-pink-400 focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Жанр</label>
                  <input
                    name="genre"
                    value={anime.genre}
                    onChange={handleChange}
                    placeholder="Например: Экшен, Фэнтези"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Год выхода</label>
                  <input
                    name="year"
                    value={anime.year}
                    onChange={handleChange}
                    placeholder="Например: 2024"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                {type === "anime" && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-200">Количество серий</label>
                    <input
                      name="episodes"
                      value={anime.episodes}
                      onChange={handleChange}
                      placeholder="Например: 12"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-200">Описание</label>
                  <textarea
                    name="description"
                    value={anime.description}
                    onChange={handleChange}
                    placeholder="Добавь красивое описание аниме или фильма"
                    className="h-44 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-pink-400 focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="glass-card relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-black text-white">Медиа</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Ссылка на постер</label>
                    <input
                      name="image"
                      value={anime.image}
                      onChange={handleChange}
                      placeholder="Вставь ссылку на постер"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-pink-400 focus:ring-2 focus:ring-pink-500/30"
                    />
                  </div>

                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-3">
                    <p className="mb-3 text-sm font-medium text-slate-300">Превью постера</p>
                    {anime.image && !posterError ? (
                      <img
                        src={anime.image}
                        alt="poster"
                        onError={() => setPosterError(true)}
                        className="h-72 w-full rounded-[22px] object-cover"
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/5 text-slate-400">
                        {anime.image ? "Не удалось загрузить постер" : "Постер появится здесь"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Ссылка на баннер</label>
                    <input
                      name="banner"
                      value={anime.banner}
                      onChange={handleChange}
                      placeholder="Вставь ссылку на баннер"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-400 transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>

                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-3">
                    <p className="mb-3 text-sm font-medium text-slate-300">Превью баннера</p>
                    {anime.banner && !bannerError ? (
                      <img
                        src={anime.banner}
                        alt="banner"
                        onError={() => setBannerError(true)}
                        className="h-44 w-full rounded-[22px] object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/5 text-slate-400">
                        {anime.banner ? "Не удалось загрузить баннер" : "Баннер появится здесь"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-card relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-r from-pink-500/10 via-fuchsia-500/10 to-cyan-400/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <div className="relative">
                  <h2 className="text-2xl font-black text-white">Финальное действие</h2>
                  <p className="mt-3 text-slate-200">
                    Проверь данные перед публикацией. После отправки тайтл появится в каталоге сайта.
                  </p>

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-6 py-4 text-lg font-black text-white shadow-xl shadow-fuchsia-900/30 transition duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? "Публикация..." : "Опубликовать"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Upload;