import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser"));
    } catch {
      return null;
    }
  };

  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [favoriteAnime, setFavoriteAnime] = useState([]);

  const [banReason, setBanReason] = useState("");
  const [banType, setBanType] = useState("24h");
  const [customHours, setCustomHours] = useState("");

  const animePhrases = [
    "Сердце героя сияет ярче звёзд.",
    "Твоя история только начинается.",
    "Свет внутри сильнее любой тьмы.",
    "Каждый шаг делает тебя легендой.",
    "Мечты ведут туда, где рождается магия.",
    "Даже небо уступает твоему сиянию.",
    "Смелость меняет целые миры.",
    "Ты будто главный герой своей арки.",
    "Судьба любит тех, кто идёт вперёд.",
    "Твоя душа звучит как красивое аниме.",
    "Внутри тебя живёт целая вселенная.",
    "Твой путь — как открывающийся новый сезон.",
  ];

  const normalizeUser = (data, favoritesData) => {
    const uploaded =
      JSON.parse(localStorage.getItem(`uploaded_${data.id || data._id}`)) || [];

    const isBannedNow =
      data?.isBanned === true ||
      Boolean(data?.banned_until) ||
      Boolean(data?.banUntil);

    return {
      ...data,
      id: data.id || data._id,
      avatar:
        data.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          data.username || "User"
        )}`,
      uploadedCount: uploaded.length,
      favoritesCount: Array.isArray(favoritesData) ? favoritesData.length : 0,
      isBanned: isBannedNow,
      banUntil: data?.banUntil || data?.banned_until || null,
      banReason: data?.banReason || data?.ban_reason || "",
      is_online: Boolean(data?.is_online),
    };
  };

  const isUserBanned = useMemo(() => {
    if (!user) return false;
    if (!user.isBanned) return false;
    if (!user.banUntil) return true;

    const banEnd = new Date(user.banUntil).getTime();
    if (Number.isNaN(banEnd)) return true;

    return Date.now() < banEnd;
  }, [user]);

  const animeSubtitle = useMemo(() => {
    const key = String(user?.username || user?.id || "anime");
    const sum = [...key].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return animePhrases[sum % animePhrases.length];
  }, [user]);

  const loadUser = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);

      const current = getCurrentUser();
      setCurrentUser(current);

      const res = await fetch(`https://gargalib-backend.onrender.com/api/users/${id}`);
      const data = await res.json();

      if (!res.ok || data.message) {
        setUser(null);
        return;
      }

      const favoritesRes = await fetch(
        `https://gargalib-backend.onrender.com/api/users/${id}/favorites`
      );
      const favoritesData = await favoritesRes.json();
      setFavoriteAnime(Array.isArray(favoritesData) ? favoritesData : []);

      const preparedUser = normalizeUser(data, favoritesData);
      setUser(preparedUser);

      if (current?.id && String(current.id) !== String(preparedUser.id)) {
        const followRes = await fetch(
          `https://gargalib-backend.onrender.com/api/users/follow-status/${current.id}/${preparedUser.id}`
        );
        const followData = await followRes.json();
        setFollowing(followRes.ok ? Boolean(followData.following) : false);
      } else {
        setFollowing(false);
      }
    } catch (err) {
      console.log("LOAD USER ERROR:", err);
      if (!silent) setUser(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  useEffect(() => {
    const handleUserChanged = () => {
      setCurrentUser(getCurrentUser());
      loadUser({ silent: true });
    };

    const handleStorage = () => {
      setCurrentUser(getCurrentUser());
      loadUser({ silent: true });
    };

    const handleFocus = () => {
      loadUser({ silent: true });
    };

    const interval = setInterval(() => {
      loadUser({ silent: true });
    }, 2500);

    window.addEventListener("userChanged", handleUserChanged);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("userChanged", handleUserChanged);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [id]);

  const followUser = async () => {
    if (!currentUser?.id || !user?.id) return;

    try {
      const res = await fetch("https://gargalib-backend.onrender.com/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerId: currentUser.id,
          followingId: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Ошибка подписки");
        return;
      }

      setFollowing(Boolean(data.following));
      setUser((prev) => ({
        ...prev,
        followers: data.following
          ? (prev.followers || 0) + 1
          : Math.max((prev.followers || 0) - 1, 0),
      }));
    } catch (err) {
      console.log(err);
    }
  };

  const getBanHours = () => {
    if (banType === "24h") return 24;
    if (banType === "7d") return 24 * 7;
    if (banType === "30d") return 24 * 30;
    return Number(customHours) || 1;
  };

  const canManageBan = useMemo(() => {
    if (!currentUser || !user) return false;
    if (String(currentUser.id) === String(user.id)) return false;

    if (currentUser.role === "owner") return user.role !== "owner";
    if (currentUser.role === "admin") return user.role === "user";
    return false;
  }, [currentUser, user]);

  const handleBan = async () => {
    if (!currentUser?.id || !user?.id) return;

    try {
      const res = await fetch("https://gargalib-backend.onrender.com/api/users/ban", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id,
          targetUserId: user.id,
          durationHours: getBanHours(),
          reason: banReason || "Нарушение правил",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Ошибка бана");
        return;
      }

      alert("Пользователь забанен");
      await loadUser({ silent: true });
    } catch (err) {
      console.log(err);
      alert("Ошибка сервера при бане");
    }
  };

  const handleUnban = async () => {
    if (!currentUser?.id || !user?.id) return;

    try {
      const res = await fetch("https://gargalib-backend.onrender.com/api/users/unban", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: currentUser.id,
          targetUserId: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Ошибка разбана");
        return;
      }

      alert("Пользователь разбанен");
      await loadUser({ silent: true });
    } catch (err) {
      console.log(err);
      alert("Ошибка сервера при разбане");
    }
  };

  const roleBadge = useMemo(() => {
    if (!user?.role) return "USER";
    return user.role.toUpperCase();
  }, [user]);

  const showUploadedStats = user?.role === "admin" || user?.role === "owner";

  const canSeeEmail =
    currentUser?.role === "admin" ||
    currentUser?.role === "owner" ||
    String(currentUser?.id) === String(user?.id);

  const openPrivateChat = () => {
    if (!user?.id) return;
    navigate(`/chat?user=${user.id}`);
  };

  const renderAnimeGrid = (items, emptyText) => {
    if (!items.length) {
      return (
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-14 text-center text-slate-300 backdrop-blur-xl">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((anime, index) => (
          <div
            key={anime.id || anime._id}
            onClick={() => navigate(`/anime/${anime.id || anime._id}`)}
            className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-fuchsia-300/20"
            style={{
              animation: `cardReveal .65s ease forwards`,
              animationDelay: `${index * 70}ms`,
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_35%)]" />
            <div className="relative h-48 overflow-hidden">
              <img
                src={anime.image || "https://placehold.co/400x300?text=Anime"}
                alt={anime.title}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090d1d] via-[#090d1d]/20 to-transparent" />
              <div className="absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent_15%,rgba(255,255,255,0.18)_35%,transparent_55%)] transition duration-[1300ms] group-hover:translate-x-full" />
            </div>
            <div className="relative p-4">
              <p className="line-clamp-2 text-lg font-bold text-white transition group-hover:text-pink-300">
                {anime.title}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {anime.genre || "Без жанра"}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const formatBanDate = (date) => {
    if (!date) return "Навсегда";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Навсегда";
    return parsed.toLocaleString();
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060816] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,#040611_0%,#0b122a_46%,#1b1038_100%)]" />
        <div className="relative rounded-[30px] border border-white/10 bg-white/10 px-8 py-5 text-lg backdrop-blur-2xl shadow-2xl shadow-black/40">
          Загрузка профиля...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060816] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,#040611_0%,#0b122a_46%,#1b1038_100%)]" />
        <div className="relative rounded-[30px] border border-white/10 bg-white/10 px-8 py-5 text-lg backdrop-blur-2xl shadow-2xl shadow-black/40">
          Профиль не найден
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.62; transform: scale(1.08); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.24; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.24); }
        }
        @keyframes cometSweep {
          0% { transform: translate3d(0,0,0) scale(.95); opacity: 0; }
          10% { opacity: .95; }
          58% { opacity: .85; }
          100% { transform: translate3d(-480px,260px,0) scale(1.03); opacity: 0; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: .24; }
          25% { transform: translateY(-16px) translateX(6px) scale(1.09); opacity: .42; }
          50% { transform: translateY(8px) translateX(-8px) scale(.97); opacity: .28; }
          75% { transform: translateY(-10px) translateX(10px) scale(1.05); opacity: .48; }
        }
        @keyframes petalFall {
          0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; }
          10% { opacity: .85; }
          50% { transform: translate3d(50px,52vh,0) rotate(160deg); }
          100% { transform: translate3d(-46px,115vh,0) rotate(320deg); opacity: 0; }
        }
        @keyframes auroraWave {
          0%, 100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); opacity: .32; }
          33% { transform: translate3d(34px,-14px,0) scale(1.08) rotate(3deg); opacity: .56; }
          66% { transform: translate3d(-20px,12px,0) scale(.96) rotate(-3deg); opacity: .4; }
        }
        @keyframes shineSweep {
          0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
          20% { opacity: .3; }
          60% { opacity: .16; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }
        @keyframes moonPulse {
          0%, 100% { transform: scale(1); opacity: .88; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes ringFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: .18; }
          50% { transform: translateY(-10px) scale(1.04); opacity: .34; }
        }
        @keyframes driftGlow {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: .2; }
          50% { transform: translate3d(18px,-12px,0) scale(1.08); opacity: .34; }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes sparkleFlash {
          0%, 100% { opacity: .18; transform: scale(.9) rotate(0deg); }
          50% { opacity: .95; transform: scale(1.35) rotate(45deg); }
        }
        @keyframes slowBeam {
          0% { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
          30% { opacity: .12; }
          100% { transform: translateX(180%) skewX(-20deg); opacity: 0; }
        }
        .glass-border::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(244,114,182,.32), rgba(34,211,238,.2), rgba(168,85,247,.26));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>

      <div className="relative min-h-screen overflow-hidden bg-[#060816] text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_24%),radial-gradient(circle_at_bottom,rgba(244,114,182,0.18),transparent_34%),linear-gradient(180deg,#040611_0%,#0b122a_38%,#160c32_72%,#24103d_100%)]" />
          <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.05),transparent_22%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />

          <div
            className="absolute right-[7%] top-[6%] opacity-90"
            style={{ animation: "moonPulse 7s ease-in-out infinite" }}
          >
            <div className="absolute inset-[-26px] rounded-full bg-fuchsia-400/12 blur-3xl" />
            <div className="absolute inset-[-42px] rounded-full bg-cyan-300/10 blur-3xl" />
            <div
              className="absolute inset-[-62px] rounded-full border border-white/10"
              style={{ animation: "ringFloat 10s ease-in-out infinite" }}
            />
            <div className="relative h-28 w-28 rounded-full border border-white/15 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.95),rgba(226,232,240,0.72)_35%,rgba(192,132,252,0.18)_70%,rgba(255,255,255,0.06)_100%)] shadow-[0_0_35px_rgba(255,255,255,0.16)] sm:h-36 sm:w-36">
              <div className="absolute left-[22%] top-[30%] h-3 w-3 rounded-full bg-white/20 blur-[1px]" />
              <div className="absolute left-[56%] top-[24%] h-2.5 w-2.5 rounded-full bg-white/15 blur-[1px]" />
              <div className="absolute left-[44%] top-[56%] h-4 w-4 rounded-full bg-white/15 blur-[1px]" />
            </div>
          </div>

          <div
            className="absolute left-[12%] top-[16%] h-20 w-20 rounded-full bg-fuchsia-400/10 blur-3xl"
            style={{ animation: "driftGlow 12s ease-in-out infinite" }}
          />
          <div
            className="absolute right-[18%] bottom-[22%] h-24 w-24 rounded-full bg-cyan-300/10 blur-3xl"
            style={{ animation: "driftGlow 14s ease-in-out infinite reverse" }}
          />

          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={`flash-${i}`}
              className="absolute block h-[2px] w-[16px] rounded-full bg-white/80"
              style={{
                left: `${8 + i * 11}%`,
                top: `${12 + ((i * 9) % 60)}%`,
                transform: `rotate(${i * 29}deg)`,
                boxShadow: "0 0 16px rgba(255,255,255,0.85)",
                animation: `sparkleFlash ${3.4 + (i % 4)}s ease-in-out ${i * 0.25}s infinite`,
              }}
            />
          ))}

          <div
            className="absolute -left-[8%] top-[6%] h-44 w-[52%] rounded-full bg-pink-400/10 blur-3xl"
            style={{ animation: "auroraWave 16s ease-in-out infinite" }}
          />
          <div
            className="absolute right-[-8%] top-[14%] h-48 w-[48%] rounded-full bg-cyan-400/10 blur-3xl"
            style={{ animation: "auroraWave 18s ease-in-out infinite reverse" }}
          />
          <div
            className="absolute left-[18%] bottom-[12%] h-44 w-[46%] rounded-full bg-violet-500/10 blur-3xl"
            style={{ animation: "auroraWave 17s ease-in-out infinite" }}
          />

          {[
            { left: "68%", top: "10%", delay: "0s", duration: "8.5s", width: 180 },
            { left: "80%", top: "18%", delay: "2.4s", duration: "10s", width: 150 },
            { left: "58%", top: "26%", delay: "5.2s", duration: "9.2s", width: 170 },
          ].map((comet, i) => (
            <span
              key={i}
              className="absolute block"
              style={{
                left: comet.left,
                top: comet.top,
                animation: `cometSweep ${comet.duration} linear ${comet.delay} infinite`,
              }}
            >
              <span
                className="block h-[3px] rounded-full opacity-95 blur-[0.35px]"
                style={{
                  width: `${comet.width}px`,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0), rgba(125,211,252,0.35), rgba(255,255,255,0.95))",
                  boxShadow:
                    "0 0 16px rgba(255,255,255,0.65), 0 0 34px rgba(56,189,248,0.28)",
                  transform: "rotate(154deg)",
                  transformOrigin: "right center",
                }}
              />
              <span
                className="absolute -right-[2px] -top-[3px] h-[9px] w-[9px] rounded-full bg-white"
                style={{
                  boxShadow:
                    "0 0 18px rgba(255,255,255,1), 0 0 28px rgba(244,114,182,0.42), 0 0 42px rgba(34,211,238,0.35)",
                }}
              />
            </span>
          ))}

          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={`star-${i}`}
              className="absolute block rounded-full bg-white"
              style={{
                width: `${(i % 3) + 2}px`,
                height: `${(i % 3) + 2}px`,
                left: `${(i * 13) % 100}%`,
                top: `${(i * 17) % 100}%`,
                boxShadow: "0 0 12px rgba(255,255,255,0.95)",
                animation: `twinkle ${2.2 + (i % 4)}s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}

          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={`orb-${i}`}
              className="absolute block rounded-full"
              style={{
                width: `${18 + (i % 4) * 10}px`,
                height: `${18 + (i % 4) * 10}px`,
                left: `${(i * 12) % 100}%`,
                top: `${18 + ((i * 9) % 70)}%`,
                background:
                  i % 3 === 0
                    ? "rgba(244,114,182,0.10)"
                    : i % 3 === 1
                    ? "rgba(34,211,238,0.10)"
                    : "rgba(168,85,247,0.10)",
                filter: "blur(2px)",
                boxShadow: "0 0 24px rgba(255,255,255,0.1)",
                animation: `orbFloat ${8 + (i % 5) * 2}s ease-in-out ${i * 0.45}s infinite`,
              }}
            />
          ))}

          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={`petal-${i}`}
              className="absolute block rounded-full bg-gradient-to-br from-pink-200/80 via-pink-300/60 to-fuchsia-400/40 blur-[1px]"
              style={{
                width: `${9 + (i % 4) * 4}px`,
                height: `${7 + (i % 3) * 4}px`,
                left: `${(i * 7) % 100}%`,
                top: `-${8 + i * 5}%`,
                animation: `petalFall ${12 + (i % 5) * 2.2}s linear ${i * 0.7}s infinite`,
                borderRadius: "70% 30% 60% 40% / 60% 40% 60% 40%",
              }}
            />
          ))}
        </div>

        <div className="relative h-[380px] overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/16 via-violet-500/10 to-cyan-400/16" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b18] via-[#070b18]/55 to-transparent" />
          <div
            className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_35%,transparent_65%)]"
            style={{ animation: "shineSweep 8s ease-in-out infinite" }}
          />
          <div
            className="absolute inset-y-0 -left-1/4 w-1/4 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "slowBeam 12s ease-in-out infinite" }}
          />

          <div
            className="relative z-10 mx-auto flex h-full max-w-6xl items-end px-4 pb-10 sm:px-6 lg:px-8"
            style={{ animation: "heroFloat 8s ease-in-out infinite" }}
          >
            <div className="glass-border relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-pink-400/60 via-white/70 to-cyan-300/60" />
              <h1 className="mt-4 bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-4xl font-extrabold text-transparent sm:text-6xl">
                {user.username}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                Anime-сайт для просмотра любимых тайтлов, общения с другими пользователями, поиска нового аниме и сохранения всего самого интересного в избранное.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
            <aside className="glass-border relative overflow-hidden rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl transition duration-500 hover:-translate-y-1">
              <div
                className="absolute -right-14 top-4 h-36 w-36 rounded-full bg-pink-500/14 blur-3xl"
                style={{ animation: "glowPulse 6s ease-in-out infinite" }}
              />
              <div
                className="absolute left-3 bottom-3 h-24 w-24 rounded-full bg-cyan-400/12 blur-3xl"
                style={{ animation: "glowPulse 8s ease-in-out infinite" }}
              />

              <div className="relative flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-[-14px] rounded-full bg-gradient-to-r from-pink-500/35 to-cyan-400/30 blur-2xl" />
                  <img
                    src={
                      user.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.username || "User"
                      )}`
                    }
                    alt={user.username}
                    className="relative h-36 w-36 rounded-full border-4 border-white/20 object-cover shadow-2xl shadow-pink-950/30 transition duration-500 hover:scale-105"
                  />
                </div>

                <h2 className="mt-5 break-words text-2xl font-bold text-white">
                  {user.username}
                </h2>
                <p className="mt-2 max-w-[280px] text-sm leading-6 text-pink-100/90 sm:text-[15px]">
                  {animeSubtitle}
                </p>

                {canSeeEmail && (
                  <div className="mt-2 w-full max-w-[260px]">
                    <p
                      className="truncate text-sm text-slate-300"
                      title={user.email}
                    >
                      {user.email}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.25em] text-pink-300">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      user.is_online
                        ? "bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]"
                        : "bg-red-400"
                    }`}
                  />
                  {user.is_online ? "ONLINE" : "OFFLINE"}
                </div>

                {isUserBanned && (
                  <div className="mt-4 w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <div className="font-bold uppercase tracking-[0.15em] text-red-300">
                      Забанен
                    </div>
                    <div className="mt-2 text-left">
                      <p>
                        <span className="font-semibold text-red-300">
                          Причина:
                        </span>{" "}
                        {user.banReason || "Не указана"}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-red-300">До:</span>{" "}
                        {formatBanDate(user.banUntil)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-full bg-gradient-to-r from-pink-500/15 to-violet-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">
                  {roleBadge}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 p-4 text-center transition duration-300 hover:bg-white/10">
                  <p className="text-2xl font-bold text-pink-300">
                    {user.followers || 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Подписчики</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-center transition duration-300 hover:bg-white/10">
                  <p className="text-2xl font-bold text-cyan-300">
                    {user.following || 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Подписки</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-center transition duration-300 hover:bg-white/10">
                  <p className="text-2xl font-bold text-yellow-300">
                    {user.favoritesCount || 0}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Избранное</p>
                </div>
                {showUploadedStats && (
                  <div className="rounded-2xl bg-white/5 p-4 text-center transition duration-300 hover:bg-white/10">
                    <p className="text-2xl font-bold text-emerald-300">
                      {user.uploadedCount || 0}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Загружено</p>
                  </div>
                )}
              </div>

              {currentUser?.id !== user.id && (
                <div className="mt-6 space-y-3">
                  <button
                    onClick={followUser}
                    className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:scale-[1.02] ${
                      following
                        ? "border border-white/10 bg-white/10 text-white hover:bg-white/15"
                        : "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-xl shadow-fuchsia-900/30"
                    }`}
                  >
                    {following ? "Вы подписаны" : "Подписаться"}
                  </button>

                  <button
                    onClick={openPrivateChat}
                    className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition duration-300 hover:scale-[1.02] hover:bg-cyan-400/20"
                  >
                    Открыть чат
                  </button>
                </div>
              )}

              {canManageBan && (
                <div className="mt-6 overflow-hidden rounded-[28px] border border-red-400/15 bg-gradient-to-br from-red-500/10 via-[#2b1026]/90 to-black/30 shadow-xl shadow-red-950/20">
                  <div className="border-b border-red-400/10 bg-gradient-to-r from-red-500/15 to-pink-500/10 px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-200">
                      Ban Control
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold text-white">
                      Панель управления баном
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Управляйте ограничениями аккаунта красиво и удобно.
                    </p>
                  </div>

                  <div className="p-5">
                    <div
                      className={`mb-5 rounded-2xl border px-4 py-4 ${
                        isUserBanned
                          ? "border-red-400/20 bg-red-500/10"
                          : "border-emerald-400/20 bg-emerald-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-300">
                            Статус аккаунта
                          </p>
                          <p
                            className={`mt-1 text-lg font-bold ${
                              isUserBanned
                                ? "text-red-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {isUserBanned
                              ? "Аккаунт забанен"
                              : "Аккаунт активен"}
                          </p>
                        </div>
                        <div
                          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ${
                            isUserBanned
                              ? "bg-red-500/20 text-red-200"
                              : "bg-emerald-500/20 text-emerald-200"
                          }`}
                        >
                          {isUserBanned ? "BAN" : "ACTIVE"}
                        </div>
                      </div>

                      {isUserBanned && (
                        <div className="mt-4 rounded-2xl bg-black/20 p-4 text-sm text-slate-200">
                          <p>
                            <span className="font-semibold text-red-300">
                              Причина:
                            </span>{" "}
                            {user.banReason || "Не указана"}
                          </p>
                          <p className="mt-2">
                            <span className="font-semibold text-red-300">
                              До:
                            </span>{" "}
                            {formatBanDate(user.banUntil)}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isUserBanned && (
                      <>
                        <div className="mb-4">
                          <label className="mb-2 block text-sm font-semibold text-red-200">
                            Срок бана
                          </label>
                          <select
                            value={banType}
                            onChange={(e) => setBanType(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-red-400/40"
                          >
                            <option value="24h">24 часа</option>
                            <option value="7d">7 дней</option>
                            <option value="30d">30 дней</option>
                            <option value="custom">Свой срок</option>
                          </select>
                        </div>

                        {banType === "custom" && (
                          <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-red-200">
                              Свой срок
                            </label>
                            <input
                              value={customHours}
                              onChange={(e) => setCustomHours(e.target.value)}
                              placeholder="Введите срок в часах"
                              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-red-400/40"
                            />
                          </div>
                        )}

                        <div className="mb-5">
                          <label className="mb-2 block text-sm font-semibold text-red-200">
                            Причина бана
                          </label>
                          <textarea
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Напишите причину бана..."
                            className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-red-400/40"
                          />
                        </div>

                        <button
                          onClick={handleBan}
                          className="w-full rounded-2xl bg-gradient-to-r from-red-500 via-pink-500 to-fuchsia-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-red-950/30 transition duration-300 hover:scale-[1.02]"
                        >
                          🔨 Забанить пользователя
                        </button>
                      </>
                    )}

                    {isUserBanned && (
                      <button
                        onClick={handleUnban}
                        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-950/30 transition duration-300 hover:scale-[1.02]"
                      >
                        ✅ Разбанить пользователя
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>

            <section className="space-y-8">
              <div className="glass-border relative overflow-hidden rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl transition duration-500 hover:-translate-y-1 sm:p-8">
                <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-fuchsia-500/12 blur-3xl" />
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: "overview", label: "Обзор" },
                    { key: "favorites", label: "Избранное" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:scale-105 ${
                        activeTab === tab.key
                          ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-900/30"
                          : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "overview" && (
                  <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition duration-300 hover:bg-white/10">
                      <h3 className="text-2xl font-bold text-white">
                        О пользователе
                      </h3>
                      <p className="mt-4 leading-8 text-slate-300">
                        Публичный профиль пользователя GarGaLib.
                      </p>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {canSeeEmail && (
                          <div className="rounded-2xl bg-black/20 p-4">
                            <p className="text-sm text-slate-400">Email</p>
                            <p
                              className="mt-1 truncate font-semibold text-white"
                              title={user.email}
                            >
                              {user.email}
                            </p>
                          </div>
                        )}

                        <div className="rounded-2xl bg-black/20 p-4">
                          <p className="text-sm text-slate-400">Роль</p>
                          <p className="mt-1 font-semibold text-pink-300">
                            {roleBadge}
                          </p>
                        </div>

                        {isUserBanned && (
                          <div className="rounded-2xl bg-red-500/10 p-4 sm:col-span-2">
                            <p className="text-sm text-red-300">Статус</p>
                            <p className="mt-1 font-semibold text-white">
                              Аккаунт забанен
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                              Причина: {user.banReason || "Не указана"}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              До: {formatBanDate(user.banUntil)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-400/10 p-6 transition duration-300 hover:from-pink-500/15 hover:to-cyan-400/15">
                      <h3 className="text-2xl font-bold text-white">
                        Быстрые действия
                      </h3>
                      <div className="mt-5 space-y-3">
                        <button
                          onClick={() => setActiveTab("favorites")}
                          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm text-white transition hover:bg-white/15"
                        >
                          Посмотреть избранное
                        </button>

                        {currentUser?.id !== user.id && (
                          <button
                            onClick={openPrivateChat}
                            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm text-white transition hover:bg-white/15"
                          >
                            Написать в чат
                          </button>
                        )}

                        <button
                          onClick={() => navigate(-1)}
                          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm text-white transition hover:bg-white/15"
                        >
                          Вернуться назад
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "favorites" && (
                  <div className="mt-8">
                    {renderAnimeGrid(
                      favoriteAnime,
                      "У пользователя пока нет избранных аниме"
                    )}
                  </div>
                )}
              </div>

              <div className="glass-border relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-400/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl transition duration-500 hover:-translate-y-1 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Назад</h3>
                    <p className="mt-2 text-slate-300">
                      Вернуться на предыдущую страницу.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(-1)}
                    className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:scale-105 hover:bg-white/15"
                  >
                    Назад
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;