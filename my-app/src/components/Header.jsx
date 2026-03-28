import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "https://gargalib-backend.onrender.com";

const Header = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const navigate = useNavigate();
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const notificationsRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const notificationsIntervalRef = useRef(null);
  const onlineIntervalRef = useRef(null);

  const getDefaultAvatar = (name = "User") =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  };

  const getCurrentUserId = () => {
    const user = getCurrentUser();
    return user?.id || user?._id || null;
  };

  const loadUser = () => {
    const user = getCurrentUser();
    setAvatar(user?.avatar || getDefaultAvatar(user?.username || "User"));
  };

  const setUserOnline = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;

    try {
      await fetch(`${API_BASE}/api/users/online`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
    } catch (err) {
      console.log("SET ONLINE ERROR:", err);
    }
  };

  const setUserOffline = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;

    try {
      await fetch(`${API_BASE}/api/users/offline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
    } catch (err) {
      console.log("SET OFFLINE ERROR:", err);
    }
  };

  const sendOfflineBeacon = () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;

    const body = JSON.stringify({ userId: currentUserId });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(`${API_BASE}/api/users/offline`, blob);
      } else {
        fetch(`${API_BASE}/api/users/offline`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch((err) => console.log("OFFLINE KEEPALIVE ERROR:", err));
      }
    } catch (err) {
      console.log("OFFLINE BEACON ERROR:", err);
    }
  };

  const normalizeNotificationText = (notification) => {
    if (!notification) return "Новое уведомление";

    if (notification.type === "message") {
      return (
        notification.text ||
        `Новое сообщение от ${notification.from_username || "пользователя"}`
      );
    }

    return notification.text || "Новое уведомление";
  };

  const prepareNotifications = (data) => {
    const list = Array.isArray(data) ? data : [];

    return list
      .map((item) => ({
        ...item,
        text: normalizeNotificationText(item),
      }))
      .filter((item) => {
        if (item.type === "message" && item.is_read) return false;
        return true;
      });
  };

  const loadNotifications = async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/${currentUserId}`);
      const data = await res.json();
      setNotifications(prepareNotifications(data));
    } catch (err) {
      console.log("NOTIFICATIONS ERROR:", err);
    }
  };

  useEffect(() => {
    loadUser();
    loadNotifications();
    setUserOnline();

    notificationsIntervalRef.current = setInterval(() => {
      loadNotifications();
    }, 5000);

    onlineIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        setUserOnline();
      }
    }, 8000);

    const handleStorage = () => {
      loadUser();
      loadNotifications();
      setUserOnline();
    };

    const handleUserChanged = () => {
      loadUser();
      loadNotifications();
      setUserOnline();
    };

    const handleFocus = () => {
      loadUser();
      setUserOnline();
      loadNotifications();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadUser();
        setUserOnline();
        loadNotifications();
      }
    };

    const handleBeforeUnload = () => {
      sendOfflineBeacon();
    };

    const handlePageHide = () => {
      sendOfflineBeacon();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("userChanged", handleUserChanged);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("userChanged", handleUserChanged);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (notificationsIntervalRef.current) {
        clearInterval(notificationsIntervalRef.current);
      }

      if (onlineIntervalRef.current) {
        clearInterval(onlineIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }

      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSearch = async (value) => {
    setSearch(value);

    const query = value.trim();

    if (!query) {
      setResults([]);
      setShowResults(false);
      return;
    }

    try {
      const [animeRes, usersRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/anime/search?q=${encodeURIComponent(query)}`),
        fetch(`${API_BASE}/api/users`),
      ]);

      let animeData = [];
      let usersData = [];

      if (animeRes.status === "fulfilled") {
        const data = await animeRes.value.json();
        animeData = Array.isArray(data) ? data : [];
      }

      if (usersRes.status === "fulfilled") {
        const data = await usersRes.value.json();
        usersData = Array.isArray(data) ? data : [];
      }

      const filteredUsers = usersData.filter((u) =>
        u.username?.toLowerCase().includes(query.toLowerCase())
      );

      const preparedAnime = animeData.map((a) => ({
        ...a,
        type: "anime",
        source: "jikan",
      }));

      const preparedUsers = filteredUsers.map((u) => ({
        ...u,
        type: "user",
      }));

      setResults([...preparedAnime, ...preparedUsers]);
      setShowResults(true);
    } catch (err) {
      console.log("SEARCH ERROR:", err);
      setResults([]);
      setShowResults(false);
    }
  };

  const submitSearch = () => {
    if (!search.trim()) return;
    handleSearch(search);
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_BASE}/api/notifications/read/${id}`, {
        method: "PUT",
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );

      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const removeNotificationFromList = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const openNotification = async (notification) => {
    if (!notification) return;

    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.type === "message") {
      removeNotificationFromList(notification.id);
      setNotificationsOpen(false);
      setMobileMenuOpen(false);
      navigate(`/chat?user=${notification.from_user_id}`);
      return;
    }

    if (notification.from_user_id) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      setNotificationsOpen(false);
      setMobileMenuOpen(false);
      navigate(`/user/${notification.from_user_id}`);
    }
  };

  const logout = async () => {
    await setUserOffline();

    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");

    setAvatar(getDefaultAvatar("User"));
    setOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    setNotifications([]);

    window.dispatchEvent(new Event("userChanged"));
    navigate("/login");
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const SearchResults = ({ mobile = false }) => (
    showResults && results.length > 0 ? (
      <div
        className={`glass-border ${
          mobile
            ? "mt-3 rounded-[24px] bg-[#0b1120]/90"
            : "absolute left-0 top-[66px] z-50 w-full rounded-[24px] bg-[#0b1120]/90"
        } overflow-hidden shadow-2xl shadow-black/50 backdrop-blur-2xl`}
        style={{ animation: "dropdownIn .22s ease" }}
      >
        <div className="search-scroll max-h-72 overflow-y-auto p-2">
          {results.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={async () => {
                setShowResults(false);
                setSearch("");
                setMobileSearchOpen(false);
                setMobileMenuOpen(false);

                if (item.type === "anime") {
                  await openAnimePage(item);
                } else {
                  navigate(`/user/${item.id}`);
                }
              }}
              className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition duration-200 hover:translate-x-1 hover:bg-white/10"
            >
              {item.type === "anime" ? (
                <>
                  <img
                    src={item.image || "https://placehold.co/100x100?text=Anime"}
                    alt={item.title}
                    className="h-11 w-11 rounded-xl border border-white/10 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">Аниме</p>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={item.avatar || getDefaultAvatar(item.username || "User")}
                    alt={item.username}
                    className="h-11 w-11 rounded-full border border-white/15 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{item.username}</p>
                    <p className="text-xs text-slate-400">Пользователь</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <>
      <style>{`
        @keyframes headerGlow {
          0%, 100% { opacity: 0.32; transform: scale(1); }
          50% { opacity: 0.62; transform: scale(1.08); }
        }

        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.95; transform: scale(1.2); }
        }

        @keyframes floatSoft {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        @keyframes shineSweep {
          0% { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
          20% { opacity: 0.24; }
          60% { opacity: 0.12; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }

        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes cometMove {
          0% { transform: translate3d(0, 0, 0) scale(0.94); opacity: 0; }
          12% { opacity: 0.7; }
          60% { opacity: 0.55; }
          100% { transform: translate3d(-180px, 92px, 0) scale(1.02); opacity: 0; }
        }

        .glass-border::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04), rgba(255,255,255,0.12));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .search-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .search-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 999px;
          margin: 8px 0;
        }

        .search-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(244,114,182,0.85), rgba(34,211,238,0.85));
          border-radius: 999px;
          border: 2px solid rgba(11,17,32,0.9);
        }

        .search-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(251,146,60,0.95), rgba(59,130,246,0.95));
        }

        .search-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(244,114,182,0.85) rgba(255,255,255,0.05);
        }
      `}</style>

      <header className="sticky top-0 z-[1000] border-b border-white/10 bg-[#060a14]/72 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#060a14]/58">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]"></div>
          <div className="absolute -left-16 top-[-30px] h-28 w-28 rounded-full bg-fuchsia-400/10 blur-3xl" style={{ animation: "headerGlow 8s ease-in-out infinite" }}></div>
          <div className="absolute right-8 top-[-24px] h-24 w-24 rounded-full bg-sky-300/10 blur-3xl" style={{ animation: "headerGlow 10s ease-in-out infinite" }}></div>
          <div className="absolute left-[72%] top-[10%]" style={{ animation: "cometMove 7.5s linear infinite" }}>
            <span className="block h-[2px] w-[90px] rounded-full bg-gradient-to-r from-transparent via-sky-200/35 to-white/90 rotate-[154deg]"></span>
            <span className="absolute -right-[2px] -top-[3px] h-[7px] w-[7px] rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,1)]"></span>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-3 py-3 text-white sm:px-6">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <Link
                to="/home"
                className="group relative shrink-0 text-lg font-extrabold tracking-[0.08em] sm:text-2xl"
              >
                <span className="absolute -inset-3 rounded-2xl bg-white/10 opacity-0 blur-xl transition duration-500 group-hover:opacity-100"></span>
                <span className="relative bg-gradient-to-r from-white via-fuchsia-100 to-sky-200 bg-clip-text text-transparent">
                  GarGaLib
                </span>
              </Link>

              <div className="glass-border relative hidden items-center gap-2 overflow-hidden rounded-full bg-white/8 px-3 py-2 text-xs text-slate-200 lg:flex">
                <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)] animate-pulse"></span>
                <span className="relative">Anime World</span>
              </div>
            </div>

            <div ref={searchRef} className="relative hidden w-full max-w-xl md:block">
              <div className="glass-border group relative overflow-hidden rounded-[22px] bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl transition duration-300 focus-within:bg-white/12 hover:bg-white/12">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition group-focus-within:text-sky-200">
                  🔍
                </div>

                <input
                  type="text"
                  placeholder="Поиск аниме и пользователей..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => {
                    if (results.length > 0) setShowResults(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSearch();
                  }}
                  className="w-full bg-transparent py-3.5 pl-11 pr-24 text-sm text-white outline-none placeholder:text-slate-400"
                />

                <button
                  onClick={submitSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition duration-300 hover:scale-105 hover:bg-white/18"
                >
                  Найти
                </button>
              </div>

              <SearchResults />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className="glass-border rounded-2xl bg-white/10 p-3 backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-white/15 md:hidden"
              >
                🔍
              </button>

              <Link
                to="/home"
                className="hidden rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-black/20 transition duration-300 hover:scale-105 hover:bg-white/15 lg:inline-flex"
              >
                Смотреть
              </Link>

              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    if (!notificationsOpen) loadNotifications();
                  }}
                  className="glass-border relative rounded-2xl bg-white/10 p-3 backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-white/15"
                >
                  <span className="text-lg">🔔</span>

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#101521] shadow-[0_0_14px_rgba(255,255,255,0.75)]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="glass-border absolute right-0 mt-3 w-[92vw] max-w-80 overflow-hidden rounded-[26px] bg-[#0b1120]/90 p-2 shadow-2xl shadow-black/50 backdrop-blur-2xl" style={{ animation: "dropdownIn .22s ease" }}>
                    <div className="mb-2 rounded-2xl bg-white/6 px-3 py-3">
                      <p className="text-sm font-semibold text-white">Уведомления</p>
                      <p className="mt-1 text-xs text-slate-400">Подписки, сообщения и активность</p>
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="rounded-2xl bg-white/5 px-3 py-4 text-sm text-slate-400">
                          Уведомлений пока нет
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`rounded-2xl px-3 py-3 transition ${
                              n.is_read
                                ? "bg-white/5"
                                : "border border-white/10 bg-white/10"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-base">
                                {n.type === "message" ? "💬" : "🔔"}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-white">{n.text}</p>

                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <button
                                    onClick={() => openNotification(n)}
                                    className="text-xs text-sky-200 hover:underline"
                                  >
                                    {n.type === "message" ? "Открыть чат" : "Открыть профиль"}
                                  </button>

                                  {!n.is_read && (
                                    <button
                                      onClick={() => markAsRead(n.id)}
                                      className="text-xs text-white/80 hover:underline"
                                    >
                                      Прочитано
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div ref={menuRef} className="relative hidden sm:block">
                <button
                  onClick={() => setOpen(!open)}
                  className="glass-border group relative rounded-2xl bg-white/10 p-1.5 backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-white/15"
                >
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 blur-xl transition duration-500 group-hover:opacity-100"></span>
                  <img
                    src={avatar}
                    alt="avatar"
                    className="relative h-11 w-11 rounded-xl border border-white/15 object-cover"
                  />
                </button>

                {open && (
                  <div className="glass-border absolute right-0 mt-3 w-52 overflow-hidden rounded-[24px] bg-[#0b1120]/90 p-2 shadow-2xl shadow-black/50 backdrop-blur-2xl" style={{ animation: "dropdownIn .22s ease" }}>
                    <div className="mb-2 rounded-2xl bg-white/6 px-3 py-3">
                      <p className="text-sm font-semibold text-white">Мой аккаунт</p>
                      <p className="mt-1 text-xs text-slate-400">Переход к профилю</p>
                    </div>

                    <Link
                      to="/profile"
                      className="mb-1 block rounded-2xl px-3 py-3 text-sm text-white transition hover:bg-white/10"
                      onClick={() => setOpen(false)}
                    >
                      Профиль
                    </Link>

                    <button
                      onClick={logout}
                      className="block w-full rounded-2xl px-3 py-3 text-left text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>

              <div ref={mobileMenuRef} className="relative sm:hidden">
                <button
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="glass-border rounded-2xl bg-white/10 px-3 py-3 text-sm backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-white/15"
                >
                  ☰
                </button>

                {mobileMenuOpen && (
                  <div
                    className="glass-border absolute right-0 mt-3 w-56 overflow-hidden rounded-[24px] bg-[#0b1120]/90 p-2 shadow-2xl shadow-black/50 backdrop-blur-2xl"
                    style={{ animation: "dropdownIn .22s ease" }}
                  >
                    <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-3">
                      <img
                        src={avatar}
                        alt="avatar"
                        className="h-10 w-10 rounded-xl border border-white/15 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">Мой аккаунт</p>
                        <p className="text-xs text-slate-400">Меню</p>
                      </div>
                    </div>

                    <Link
                      to="/home"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mb-1 block rounded-2xl px-3 py-3 text-sm text-white transition hover:bg-white/10"
                    >
                      Главная
                    </Link>

                    <Link
                      to="/animes"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mb-1 block rounded-2xl px-3 py-3 text-sm text-white transition hover:bg-white/10"
                    >
                      Аниме
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mb-1 block rounded-2xl px-3 py-3 text-sm text-white transition hover:bg-white/10"
                    >
                      Профиль
                    </Link>

                    <button
                      onClick={logout}
                      className="block w-full rounded-2xl px-3 py-3 text-left text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mobileSearchOpen && (
            <div ref={searchRef} className="mt-3 md:hidden">
              <div className="glass-border group relative overflow-hidden rounded-[22px] bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl transition duration-300 focus-within:bg-white/12 hover:bg-white/12">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition group-focus-within:text-sky-200">
                  🔍
                </div>

                <input
                  type="text"
                  placeholder="Поиск аниме и пользователей..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => {
                    if (results.length > 0) setShowResults(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSearch();
                  }}
                  className="w-full bg-transparent py-3.5 pl-11 pr-24 text-sm text-white outline-none placeholder:text-slate-400"
                />

                <button
                  onClick={submitSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition duration-300 hover:scale-105 hover:bg-white/18"
                >
                  Найти
                </button>
              </div>

              <SearchResults mobile />
            </div>
          )}
        </div>
      </header>

      <main>{children}</main>
    </>
  );
};

export default Header;