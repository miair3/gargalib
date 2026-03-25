import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({
    id: "",
    username: "",
    email: "",
    avatar: "",
    role: "user",
    followers: 0,
    following: 0,
  });

  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState("profile");
  const [users, setUsers] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [newName, setNewName] = useState("");
  const [animeList, setAnimeList] = useState([]);
  const [watchedIds, setWatchedIds] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [stats, setStats] = useState({ watched: 0, favorites: 0, uploaded: 0 });

  const [connectionsModal, setConnectionsModal] = useState({
    open: false,
    type: "followers",
    title: "",
    users: [],
    loading: false,
  });

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser"));
    } catch {
      return null;
    }
  };

  const normalizeUserCard = (u) => {
    if (!u) return null;

    return {
      id: u.id || u._id || u.userId || "",
      username: u.username || u.name || "Пользователь",
      email: u.email || "",
      avatar:
        u.avatar ||
        localStorage.getItem(`avatar_${u.id || u._id || u.userId}`) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          u.username || u.name || "User"
        )}`,
      role: u.role || "user",
    };
  };

  const buildConnectionUsers = (targetUser, type, allUsersList = []) => {
    const objectKeys =
      type === "followers"
        ? [
            "followersUsers",
            "followersList",
            "followersData",
            "followerUsers",
            "followers_info",
          ]
        : [
            "followingUsers",
            "followingList",
            "followingData",
            "following_info",
            "subscriptionsUsers",
          ];

    for (const key of objectKeys) {
      const value = targetUser?.[key];
      if (Array.isArray(value) && value.length) {
        return value.map(normalizeUserCard).filter(Boolean);
      }
    }

    const rawArray =
      type === "followers"
        ? targetUser?.followers
        : targetUser?.following;

    if (Array.isArray(rawArray) && rawArray.length) {
      if (typeof rawArray[0] === "object" && rawArray[0] !== null) {
        return rawArray.map(normalizeUserCard).filter(Boolean);
      }

      const ids = rawArray.map(String);
      return allUsersList
        .filter((u) => ids.includes(String(u.id || u._id)))
        .map(normalizeUserCard)
        .filter(Boolean);
    }

    return [];
  };

  const openConnectionsModal = async (type) => {
    try {
      setConnectionsModal({
        open: true,
        type,
        title: type === "followers" ? "Подписчики" : "Подписки",
        users: [],
        loading: true,
      });

      const currentUser = getCurrentUser();
      if (!currentUser?.id) {
        setConnectionsModal((prev) => ({ ...prev, loading: false }));
        return;
      }

      const [profileRes, usersRes] = await Promise.all([
        fetch(`https://gargalib-backend.onrender.com/api/users/${currentUser.id}?t=${Date.now()}`, {
          cache: "no-store",
        }),
        fetch(`https://gargalib-backend.onrender.com/api/users?t=${Date.now()}`, {
          cache: "no-store",
        }),
      ]);

      const freshProfile = await profileRes.json();
      const allUsers = await usersRes.json();

      const allUsersList = Array.isArray(allUsers) ? allUsers : [];
      const preparedList = buildConnectionUsers(
        freshProfile,
        type,
        allUsersList
      );

      setConnectionsModal({
        open: true,
        type,
        title: type === "followers" ? "Подписчики" : "Подписки",
        users: preparedList,
        loading: false,
      });
    } catch (err) {
      console.log(err);
      setConnectionsModal((prev) => ({ ...prev, users: [], loading: false }));
    }
  };

  const closeConnectionsModal = () => {
    setConnectionsModal({
      open: false,
      type: "followers",
      title: "",
      users: [],
      loading: false,
    });
  };

  const openUserProfile = (selectedUserId) => {
    if (!selectedUserId) return;
    closeConnectionsModal();
    navigate(`/user/${selectedUserId}`);
  };

  const loadCurrentProfile = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const currentUser = getCurrentUser();
      if (!currentUser?.id) {
        if (!silent) setLoading(false);
        return;
      }

      const res = await fetch(
        `https://gargalib-backend.onrender.com/api/users/${currentUser.id}?t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json();
      if (!res.ok || data?.message) {
        if (!silent) setLoading(false);
        return;
      }

      const savedAvatar = localStorage.getItem(`avatar_${currentUser.id}`);
      const watched = JSON.parse(
        localStorage.getItem(`watched_${currentUser.id}`) || "[]"
      );
      const favorites = JSON.parse(
        localStorage.getItem(`favorites_${currentUser.id}`) || "[]"
      );
      const uploaded = JSON.parse(
        localStorage.getItem(`uploaded_${currentUser.id}`) || "[]"
      );

      const preparedUser = {
        ...data,
        avatar: savedAvatar || data.avatar || "https://i.pravatar.cc/150",
      };

      setUser(preparedUser);
      setNewName(preparedUser.username || "");
      setWatchedIds(watched);
      setFavoriteIds(favorites);
      setStats({
        watched: watched.length,
        favorites: favorites.length,
        uploaded: uploaded.length,
      });
      localStorage.setItem("currentUser", JSON.stringify(preparedUser));
    } catch (err) {
      console.log(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadUsersForOwner = async (searchValue = searchEmail) => {
    try {
      const res = await fetch(`https://gargalib-backend.onrender.com/api/users?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setUsers(list);
      if (!searchValue.trim()) {
        setFilteredUsers(list);
        return;
      }
      setFilteredUsers(
        list.filter((u) =>
          (u.email || "").toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    } catch (err) {
      console.log(err);
    }
  };

  const loadAnime = async () => {
    try {
      const res = await fetch("https://gargalib-backend.onrender.com/api/anime");
      const data = await res.json();
      setAnimeList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setAnimeList([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      await Promise.all([loadCurrentProfile(), loadAnime()]);
      const freshCurrent = getCurrentUser();
      if (freshCurrent?.role === "owner") {
        await loadUsersForOwner();
      }
    };
    init();
  }, []);

  useEffect(() => {
    const reload = async () => {
      await loadCurrentProfile({ silent: true });
      const currentUser = getCurrentUser();
      if (currentUser?.role === "owner") {
        await loadUsersForOwner();
      }
    };

    window.addEventListener("userChanged", reload);
    window.addEventListener("focus", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("userChanged", reload);
      window.removeEventListener("focus", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && connectionsModal.open) {
        closeConnectionsModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [connectionsModal.open]);

  const watchedAnime = useMemo(
    () =>
      animeList.filter((anime) =>
        watchedIds.map(String).includes(String(anime.id))
      ),
    [animeList, watchedIds]
  );

  const favoriteAnime = useMemo(
    () =>
      animeList.filter((anime) =>
        favoriteIds.map(String).includes(String(anime.id))
      ),
    [animeList, favoriteIds]
  );

  const handleSearchUser = () => {
    setFilteredUsers(
      users.filter((u) =>
        (u.email || "").toLowerCase().includes(searchEmail.toLowerCase())
      )
    );
  };

  const handleSearchChange = (value) => {
    setSearchEmail(value);
    if (!value.trim()) {
      setFilteredUsers(users);
      return;
    }
    setFilteredUsers(
      users.filter((u) =>
        (u.email || "").toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  const makeAdmin = async (id) => {
    const found = users.find((u) => String(u.id) === String(id));
    if (!found) return;
    try {
      const res = await fetch("https://gargalib-backend.onrender.com/api/users/make-admin-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: found.email, ownerId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Ошибка");
        return;
      }
      await loadUsersForOwner();
      await loadCurrentProfile({ silent: true });
      window.dispatchEvent(new Event("userChanged"));
    } catch (err) {
      console.log(err);
    }
  };

  const removeAdmin = async (id) => {
    try {
      const res = await fetch("https://gargalib-backend.onrender.com/api/users/remove-admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ownerId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Ошибка");
        return;
      }
      await loadUsersForOwner();
      await loadCurrentProfile({ silent: true });
      window.dispatchEvent(new Event("userChanged"));
    } catch (err) {
      console.log(err);
    }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`https://gargalib-backend.onrender.com/api/users/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Ошибка удаления");
        return;
      }
      await loadUsersForOwner();
    } catch (err) {
      console.log(err);
    }
  };

  const logout = async () => {
    try {
      await fetch("https://gargalib-backend.onrender.com/api/users/offline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (err) {
      console.log(err);
    }
    localStorage.clear();
    window.dispatchEvent(new Event("userChanged"));
    navigate("/login");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setUser((prev) => ({ ...prev, avatar: reader.result }));
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    try {
      const res = await fetch("https://gargalib-backend.onrender.com/api/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          username: newName.trim() || user.username,
          avatar: user.avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Ошибка сохранения");
        return;
      }
      const updatedUser = {
        ...user,
        ...data.user,
        avatar: data.user.avatar || user.avatar || "https://i.pravatar.cc/150",
      };
      setUser(updatedUser);
      setNewName(updatedUser.username || "");
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      localStorage.setItem(`avatar_${updatedUser.id}`, updatedUser.avatar || "");
      window.dispatchEvent(new Event("userChanged"));
      setEdit(false);
      alert("Профиль обновлён");
    } catch (err) {
      console.log(err);
      alert("Ошибка сохранения");
    }
  };

  const roleBadge = {
    owner: "bg-gradient-to-r from-yellow-400 to-orange-500 text-black",
    admin: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white",
    user: "bg-gradient-to-r from-pink-500 to-rose-500 text-white",
  };

  const displayUsers = searchEmail.trim() ? filteredUsers : users;

  const statsCards = [
    {
      value: user.followers || 0,
      label: "Подписчики",
      icon: "👥",
      color: "from-pink-500/20 to-rose-600/10",
      clickType: "followers",
    },
    {
      value: user.following || 0,
      label: "Подписки",
      icon: "➕",
      color: "from-purple-500/20 to-indigo-600/10",
      clickType: "following",
    },
    {
      value: stats.watched,
      label: "Просмотрено",
      icon: "🎬",
      color: "from-blue-500/20 to-cyan-600/10",
    },
    {
      value: stats.favorites,
      label: "Избранное",
      icon: "⭐",
      color: "from-yellow-500/20 to-orange-600/10",
    },
    ...(user.role === "admin" || user.role === "owner"
      ? [
          {
            value: stats.uploaded,
            label: "Загружено",
            icon: "📤",
            color: "from-green-500/20 to-teal-600/10",
          },
        ]
      : []),
  ];

  const renderAnimeGrid = (items, emptyText) => {
    if (!items.length) {
      return (
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-14 text-center text-sm text-white/40 backdrop-blur-xl">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((anime) => (
          <div
            key={anime.id}
            onClick={() => navigate(`/anime/${anime.id}`)}
            className="group relative cursor-pointer overflow-hidden rounded-[26px] border border-white/10 bg-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-fuchsia-300/30"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.15),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_35%)]" />
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
              <p className="line-clamp-2 text-base font-bold text-white transition group-hover:text-pink-300">
                {anime.title}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {anime.genre || "Без жанра"}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const FloatingPetals = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
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
  );

  const Stars = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
      {Array.from({ length: 38 }).map((_, i) => (
        <span
          key={i}
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
    </div>
  );

  const Sparkles = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: `${(i * 11) % 100}%`,
            top: `${(i * 19) % 100}%`,
            animation: `sparkleFloat ${4 + (i % 5)}s ease-in-out ${i * 0.25}s infinite`,
          }}
        >
          <span
            className="block h-[2px] w-[14px] rounded-full bg-white/80 blur-[0.4px]"
            style={{
              transform: `rotate(${i * 24}deg)`,
              boxShadow: "0 0 14px rgba(255,255,255,0.8)",
            }}
          />
        </span>
      ))}
    </div>
  );

  const AuroraRibbons = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
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
    </div>
  );

  const MoonGlow = () => (
    <div className="pointer-events-none absolute right-[7%] top-[6%] opacity-90">
      <div className="absolute inset-[-26px] rounded-full bg-fuchsia-400/12 blur-3xl" />
      <div className="absolute inset-[-42px] rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative h-28 w-28 rounded-full border border-white/15 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.95),rgba(226,232,240,0.72)_35%,rgba(192,132,252,0.18)_70%,rgba(255,255,255,0.06)_100%)] shadow-[0_0_35px_rgba(255,255,255,0.16)] sm:h-36 sm:w-36">
        <div className="absolute left-[22%] top-[30%] h-3 w-3 rounded-full bg-white/20 blur-[1px]" />
        <div className="absolute left-[56%] top-[24%] h-2.5 w-2.5 rounded-full bg-white/15 blur-[1px]" />
        <div className="absolute left-[44%] top-[56%] h-4 w-4 rounded-full bg-white/15 blur-[1px]" />
      </div>
    </div>
  );

  const Comets = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
    </div>
  );

  const MagicOrbs = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
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
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b18] text-white flex items-center justify-center">
        Загрузка профиля...
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes cardReveal { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes twinkle { 0%,100% { opacity: .25; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes petalFall { 0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; } 10% { opacity: .95; } 50% { transform: translate3d(60px,50vh,0) rotate(160deg); } 100% { transform: translate3d(-50px,115vh,0) rotate(320deg); opacity: 0; } }
        @keyframes sparkleFloat { 0%,100% { opacity: .15; transform: translateY(0px) scale(.8); } 50% { opacity: 1; transform: translateY(-14px) scale(1.15); } }
        @keyframes cometSweep { 0% { transform: translate3d(0,0,0) scale(.92); opacity: 0; } 8% { opacity: .95; } 55% { opacity: .95; } 100% { transform: translate3d(-520px,290px,0) scale(1.06); opacity: 0; } }
        @keyframes auroraWave { 0%,100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); opacity: .34; } 33% { transform: translate3d(36px,-16px,0) scale(1.08) rotate(4deg); opacity: .56; } 66% { transform: translate3d(-22px,14px,0) scale(.96) rotate(-3deg); opacity: .42; } }
        @keyframes orbFloat { 0%,100% { transform: translateY(0px) translateX(0px) scale(1); opacity: .28; } 25% { transform: translateY(-18px) translateX(8px) scale(1.12); opacity: .55; } 50% { transform: translateY(10px) translateX(-10px) scale(.96); opacity: .35; } 75% { transform: translateY(-12px) translateX(12px) scale(1.08); opacity: .6; } }
        @keyframes meshMove { 0%,100% { transform: translate3d(0,0,0) scale(1); } 33% { transform: translate3d(30px,-25px,0) scale(1.08); } 66% { transform: translate3d(-20px,20px,0) scale(.96); } }
        @keyframes glowPulse { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.16); } }
        @keyframes slowRotate { 0% { transform: rotate(0deg) scale(1); } 100% { transform: rotate(360deg) scale(1.08); } }
        @keyframes backgroundPulse { 0%,100% { opacity: .32; transform: scale(1); } 50% { opacity: .6; transform: scale(1.05); } }
        @keyframes shineSweep { 0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; } 20% { opacity: .45; } 60% { opacity: .22; } 100% { transform: translateX(220%) skewX(-18deg); opacity: 0; } }
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPop { from { opacity: 0; transform: translateY(22px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .glow-card::before { content: ""; position: absolute; inset: 0; padding: 1px; border-radius: inherit; background: linear-gradient(135deg, rgba(244,114,182,.34), rgba(34,211,238,.22), rgba(168,85,247,.28)); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0; transition: opacity .35s ease; pointer-events: none; }
        .glow-card:hover::before { opacity: 1; }
      `}</style>

      <div className="relative min-h-screen overflow-x-hidden bg-[#060816] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.26),transparent_32%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_24%),radial-gradient(circle_at_bottom,rgba(244,114,182,0.20),transparent_34%),linear-gradient(180deg,#040611_0%,#0b122a_38%,#160c32_72%,#24103d_100%)]" />
          <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_50%_75%,rgba(255,255,255,0.05),transparent_22%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
          <div className="absolute -left-24 top-0 h-[22rem] w-[22rem] rounded-full bg-pink-500/20 blur-3xl" style={{ animation: "meshMove 13s ease-in-out infinite" }} />
          <div className="absolute right-[-6rem] top-[8%] h-[24rem] w-[24rem] rounded-full bg-cyan-400/20 blur-3xl" style={{ animation: "meshMove 16s ease-in-out infinite reverse" }} />
          <div className="absolute bottom-[-5rem] left-[24%] h-[20rem] w-[20rem] rounded-full bg-violet-500/20 blur-3xl" style={{ animation: "meshMove 14s ease-in-out infinite" }} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.08),transparent_35%)]" />
          <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 opacity-40" style={{ animation: "slowRotate 36s linear infinite" }} />
          <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-300/10 opacity-30" style={{ animation: "slowRotate 26s linear infinite reverse" }} />
          <div className="absolute left-1/2 top-1/2 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/5 blur-3xl" style={{ animation: "backgroundPulse 10s ease-in-out infinite" }} />
          <AuroraRibbons />
          <MoonGlow />
          <MagicOrbs />
          <Comets />
          <Stars />
          <Sparkles />
          <FloatingPetals />
        </div>

        <div className="relative mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
          <div className="glow-card relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] shadow-2xl shadow-black/40 backdrop-blur-2xl animate-[cardReveal_.8s_ease_forwards]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_42%)]" />
            <div className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ animation: "shineSweep 7.5s ease-in-out infinite" }} />
            <div className="pointer-events-none absolute -right-16 top-8 h-40 w-40 rounded-full bg-pink-500/18 blur-3xl" style={{ animation: "glowPulse 4s ease-in-out infinite" }} />
            <div className="pointer-events-none absolute left-8 bottom-8 h-28 w-28 rounded-full bg-cyan-400/16 blur-3xl" style={{ animation: "glowPulse 5s ease-in-out infinite" }} />

            <div className="relative flex flex-col gap-8 p-5 sm:p-8 lg:flex-row lg:items-center">
              <div className="relative mx-auto shrink-0 lg:mx-0">
                <div className="absolute inset-[-12px] rounded-full bg-gradient-to-br from-pink-500/55 via-fuchsia-500/40 to-cyan-400/45 blur-xl" style={{ animation: "glowPulse 3.5s ease-in-out infinite" }} />
                <div className="absolute inset-[-3px] rounded-full border border-white/20" />
                <img src={user.avatar || "https://i.pravatar.cc/150"} alt="avatar" className="relative h-32 w-32 rounded-full border-4 border-white/20 object-cover shadow-2xl sm:h-36 sm:w-36" />
                <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-[#070b18] bg-emerald-400 shadow-lg shadow-emerald-300/40" />
                {edit && (
                  <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-lg shadow-xl transition duration-300 hover:scale-105">
                    📷
                    <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                  </label>
                )}
              </div>

              <div className="flex-1 text-center lg:text-left">
                <span className="inline-flex rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-fuchsia-200 backdrop-blur-md sm:text-xs">
                  Anime profile zone
                </span>
                {edit ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/40">
                      Изменить ник
                    </p>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={30}
                      className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-fuchsia-500/60"
                      placeholder="Введите новый ник"
                    />
                  </div>
                ) : (
                  <h1 className="mt-4 bg-gradient-to-r from-white via-pink-100 to-cyan-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl lg:text-5xl">
                    {user.username || "Пользователь"}
                  </h1>
                )}
                <p className="mt-2 break-all text-sm text-white/55 sm:text-base">
                  {user.email}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <span
                    className={`inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest ${
                      roleBadge[user.role] || roleBadge.user
                    }`}
                  >
                    {user.role}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs text-white/70 backdrop-blur-md">
                    GarGaLib account
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap justify-center gap-3 lg:flex-col lg:justify-start">
                <button
                  onClick={() => (edit ? saveProfile() : setEdit(true))}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-fuchsia-900/30 transition duration-300 hover:scale-105"
                >
                  {edit ? "Сохранить" : "Редактировать"}
                </button>
                <button
                  onClick={logout}
                  className="rounded-2xl border border-red-500/30 bg-red-500/15 px-5 py-3 text-sm font-semibold text-red-300 transition duration-300 hover:scale-105 hover:bg-red-500/25"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>

          <div className={`grid gap-4 ${statsCards.length === 5 ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"}`}>
            {statsCards.map(({ value, label, icon, color, clickType }, index) => {
              const clickable = clickType === "followers" || clickType === "following";

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => clickable && openConnectionsModal(clickType)}
                  className={`glow-card relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br ${color} p-5 text-center shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 ${
                    clickable ? "cursor-pointer" : "cursor-default"
                  }`}
                  style={{
                    animation: `cardReveal .75s ease forwards`,
                    animationDelay: `${index * 90}ms`,
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_45%)]" />
                  {clickable && (
                    <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white/70">
                      открыть
                    </div>
                  )}
                  <div className="relative mb-2 text-3xl">{icon}</div>
                  <div className="relative text-3xl font-extrabold text-white">{value}</div>
                  <div className="relative mt-1 text-xs uppercase tracking-[0.24em] text-white/55">{label}</div>
                </button>
              );
            })}
          </div>

          <div className="glow-card relative rounded-[28px] border border-white/10 bg-white/10 p-3 shadow-xl backdrop-blur-2xl">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {[
                { key: "profile", label: "Профиль" },
                { key: "history", label: "История" },
                { key: "favorites", label: "Избранное" },
                ...(user.role === "owner" ? [{ key: "admin", label: "Админка" }] : []),
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition duration-300 hover:scale-105 sm:px-5 ${
                    tab === item.key
                      ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-900/30"
                      : "border border-white/10 bg-white/10 text-white/85 hover:bg-white/15"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "profile" && (
            <div className="glow-card relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
              <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-fuchsia-500/14 blur-3xl" />
              <div className="pointer-events-none absolute left-0 bottom-0 h-32 w-32 rounded-full bg-cyan-400/12 blur-3xl" />

              <div className="relative">
                <span className="inline-flex rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-pink-200">
                  Anime command center
                </span>

                <h2 className="mt-4 bg-gradient-to-r from-white via-pink-100 to-cyan-200 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                  Центр твоей коллекции
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
                  Управляй своей аниме-базой в одном месте: следи за прогрессом,
                  держи под рукой избранные тайтлы, смотри активность профиля и
                  быстро возвращайся к тому, что действительно хочешь досмотреть.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/80 to-fuchsia-500/80 text-lg shadow-lg">
                        🎴
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Профиль игрока</p>
                        <p className="text-xs text-white/40">Основа аккаунта</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-white/70">
                      <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                        <span>Роль</span>
                        <span className="font-semibold text-white">{user.role}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                        <span>Подписчики</span>
                        <span className="font-semibold text-white">{user.followers || 0}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                        <span>Подписки</span>
                        <span className="font-semibold text-white">{user.following || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/80 to-blue-500/80 text-lg shadow-lg">
                        📺
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Личный архив</p>
                        <p className="text-xs text-white/40">То, что уже собрано</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-white/70">
                      <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                        <span>Просмотрено</span>
                        <span className="font-semibold text-white">{stats.watched}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                        <span>Избранное</span>
                        <span className="font-semibold text-white">{stats.favorites}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                        <span>Загружено</span>
                        <span className="font-semibold text-white">
                          {user.role === "admin" || user.role === "owner" ? stats.uploaded : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500/80 to-orange-500/80 text-lg shadow-lg">
                        ⚡
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Быстрый маршрут</p>
                        <p className="text-xs text-white/40">Куда идти дальше</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm leading-6 text-white/70">
                      <div className="rounded-2xl bg-white/5 px-3 py-3">
                        Открой <span className="font-semibold text-white">Историю</span>, чтобы
                        продолжить просмотр без лишнего поиска.
                      </div>
                      <div className="rounded-2xl bg-white/5 px-3 py-3">
                        Держи важные тайтлы в <span className="font-semibold text-white">Избранном</span>,
                        чтобы собрать свой личный топ.
                      </div>
                      <div className="rounded-2xl bg-white/5 px-3 py-3">
                        Проверяй <span className="font-semibold text-white">подписчиков и подписки</span>,
                        если хочешь следить за активностью сообщества.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="glow-card relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
              <h2 className="mb-6 bg-gradient-to-r from-white via-pink-100 to-cyan-200 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                История просмотра
              </h2>
              {renderAnimeGrid(watchedAnime, "История просмотра пока пуста")}
            </div>
          )}

          {tab === "favorites" && (
            <div className="glow-card relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
              <h2 className="mb-6 bg-gradient-to-r from-white via-pink-100 to-cyan-200 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
                Избранное
              </h2>
              {renderAnimeGrid(favoriteAnime, "В избранном пока ничего нет")}
            </div>
          )}

          {tab === "admin" && user.role === "owner" && (
            <div className="glow-card relative overflow-hidden rounded-[34px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-6 py-5 sm:px-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-base shadow-lg">
                  🔧
                </div>
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                  Панель управления
                </h2>
                <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
                  {users.length} пользователей
                </span>
              </div>
              <div className="space-y-6 p-6 sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <svg
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
                      />
                    </svg>
                    <input
                      placeholder="Поиск по email..."
                      value={searchEmail}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 transition focus:border-purple-500/60 focus:bg-black/45 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSearchUser}
                    className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-purple-900/30 transition duration-300 hover:scale-105"
                  >
                    Найти
                  </button>
                </div>
                <div className="space-y-3">
                  {displayUsers.map((u) => (
                    <div
                      key={u.id}
                      className="glow-card relative flex flex-col gap-4 rounded-[26px] border border-white/8 bg-white/8 px-5 py-4 transition duration-300 hover:bg-white/12 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={
                            u.avatar ||
                            localStorage.getItem(`avatar_${u.id}`) ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              u.username || "User"
                            )}`
                          }
                          alt={u.username}
                          className="h-11 w-11 shrink-0 rounded-full border border-white/10 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white sm:text-base">
                            {u.username}
                          </p>
                          <p className="truncate text-xs text-white/40 sm:text-sm">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            roleBadge[u.role] || roleBadge.user
                          }`}
                        >
                          {u.role}
                        </span>
                        {u.role !== "admin" && u.role !== "owner" && (
                          <button
                            onClick={() => makeAdmin(u.id)}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition duration-300 hover:scale-105 hover:bg-emerald-500/35"
                          >
                            + Admin
                          </button>
                        )}
                        {u.role === "admin" && (
                          <button
                            onClick={() => removeAdmin(u.id)}
                            className="rounded-xl border border-yellow-500/30 bg-yellow-500/20 px-3 py-2 text-xs font-semibold text-yellow-300 transition duration-300 hover:scale-105 hover:bg-yellow-500/35"
                          >
                            Убрать
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 transition duration-300 hover:scale-105 hover:bg-red-500/35"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                  {displayUsers.length === 0 && (
                    <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-14 text-center text-sm text-white/40 backdrop-blur-xl">
                      Пользователи не найдены
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {connectionsModal.open && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
            style={{ animation: "modalFade .22s ease" }}
            onClick={closeConnectionsModal}
          >
            <div
              className="glow-card relative w-full max-w-2xl overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] shadow-[0_25px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              style={{ animation: "modalPop .28s ease" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400" />
              <div className="pointer-events-none absolute -right-14 top-6 h-36 w-36 rounded-full bg-fuchsia-500/16 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-cyan-400/14 blur-3xl" />

              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-7">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-fuchsia-200/80">
                    Social list
                  </p>
                  <h3 className="mt-1 text-2xl font-extrabold text-white">
                    {connectionsModal.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={closeConnectionsModal}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl text-white/80 transition hover:scale-105 hover:bg-white/15"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto px-5 py-5 sm:px-7">
                {connectionsModal.loading ? (
                  <div className="rounded-[26px] border border-white/10 bg-white/5 px-6 py-14 text-center text-sm text-white/50 backdrop-blur-xl">
                    Загрузка списка...
                  </div>
                ) : connectionsModal.users.length === 0 ? (
                  <div className="rounded-[26px] border border-white/10 bg-white/5 px-6 py-14 text-center text-sm text-white/50 backdrop-blur-xl">
                    Список пока пуст
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connectionsModal.users.map((person, index) => (
                      <button
                        key={`${person.id}-${index}`}
                        type="button"
                        onClick={() => openUserProfile(person.id)}
                        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 text-left backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.10),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.08),transparent_35%)] opacity-80" />
                        <img
                          src={person.avatar}
                          alt={person.username}
                          className="relative h-14 w-14 rounded-full border border-white/15 object-cover shadow-lg"
                        />
                        <div className="relative min-w-0 flex-1">
                          <p className="truncate text-base font-bold text-white transition group-hover:text-pink-300">
                            {person.username}
                          </p>
                          <p className="truncate text-sm text-white/45">
                            {person.email || "Без email"}
                          </p>
                        </div>
                        <span
                          className={`relative rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            roleBadge[person.role] || roleBadge.user
                          }`}
                        >
                          {person.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Profile;