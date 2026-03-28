import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://gargalib-backend.onrender.com";
const MAX_AVATAR_SAFE_LENGTH = 1_900_000;

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
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [connectionsModal, setConnectionsModal] = useState({
    open: false,
    type: "followers",
    title: "",
    users: [],
    loading: false,
  });

  const getJsonStorage = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      if (!value || value === "undefined" || value === "null") {
        return fallback;
      }
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const getCurrentUser = () => {
    return getJsonStorage("currentUser", null);
  };

  const getDefaultAvatar = (name = "User") =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

  const normalizeUserCard = (u) => {
    if (!u) return null;

    return {
      id: u.id || u._id || u.userId || "",
      username: u.username || u.name || "Пользователь",
      email: u.email || "",
      avatar: u.avatar || getDefaultAvatar(u.username || u.name || "User"),
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

    const rawArray = type === "followers" ? targetUser?.followers : targetUser?.following;

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
        fetch(`${API_BASE}/api/users/${currentUser.id}?t=${Date.now()}`, {
          cache: "no-store",
        }),
        fetch(`${API_BASE}/api/users?t=${Date.now()}`, {
          cache: "no-store",
        }),
      ]);

      const freshProfile = await profileRes.json();
      const allUsers = await usersRes.json();

      const allUsersList = Array.isArray(allUsers) ? allUsers : [];
      const preparedList = buildConnectionUsers(freshProfile, type, allUsersList);

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

      const res = await fetch(`${API_BASE}/api/users/${currentUser.id}?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || data?.message) {
        if (!silent) setLoading(false);
        return;
      }

      const watched = getJsonStorage(`watched_${currentUser.id}`, []);
      const favorites = getJsonStorage(`favorites_${currentUser.id}`, []);
      const uploaded = getJsonStorage(`uploaded_${currentUser.id}`, []);

      const preparedUser = {
        ...data,
        avatar:
          edit && avatarDirty
            ? user.avatar
            : data.avatar || currentUser.avatar || user.avatar || "",
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
      const res = await fetch(`${API_BASE}/api/users?t=${Date.now()}`, {
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
      const res = await fetch(`${API_BASE}/api/anime`);
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
      if (edit && avatarDirty) return;

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
  }, [edit, avatarDirty]);

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
      animeList.filter((anime) => watchedIds.map(String).includes(String(anime.id))),
    [animeList, watchedIds]
  );

  const favoriteAnime = useMemo(
    () =>
      animeList.filter((anime) => favoriteIds.map(String).includes(String(anime.id))),
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
      users.filter((u) => (u.email || "").toLowerCase().includes(value.toLowerCase()))
    );
  };

  const makeAdmin = async (id) => {
    const found = users.find((u) => String(u.id) === String(id));
    if (!found) return;

    try {
      const res = await fetch(`${API_BASE}/api/users/make-admin-email`, {
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
      const res = await fetch(`${API_BASE}/api/users/remove-admin`, {
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
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
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
      await fetch(`${API_BASE}/api/users/offline`, {
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

  const resizeImageToDataUrl = (file, maxWidth = 256, quality = 0.82) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          let { width, height } = img;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context error"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          let result = canvas.toDataURL("image/jpeg", quality);

          if (result.length > MAX_AVATAR_SAFE_LENGTH) {
            result = canvas.toDataURL("image/jpeg", 0.7);
          }

          resolve(result);
        };

        img.onerror = () => reject(new Error("Image load error"));
        img.src = reader.result;
      };

      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Выбери изображение");
      return;
    }

    try {
      setSelectedAvatarFile(file);

      const compressedAvatar = await resizeImageToDataUrl(file, 256, 0.82);

      if (!compressedAvatar || compressedAvatar.length > MAX_AVATAR_SAFE_LENGTH) {
        alert("Картинка слишком большая. Выбери другую.");
        return;
      }

      setAvatarDirty(true);
      setUser((prev) => ({
        ...prev,
        avatar: compressedAvatar,
      }));
    } catch (err) {
      console.log("AVATAR PREPARE ERROR:", err);
      alert("Ошибка обработки изображения");
    }
  };

  const saveProfile = async () => {
    try {
      const currentUser = getCurrentUser();

      if (!user.id) {
        alert("Не найден пользователь");
        return;
      }

      const safeAvatar = user.avatar || currentUser?.avatar || "";

      if (typeof safeAvatar === "string" && safeAvatar.length > MAX_AVATAR_SAFE_LENGTH) {
        alert("Аватар слишком большой");
        return;
      }

      setSavingProfile(true);

      const res = await fetch(`${API_BASE}/api/users/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          username: newName.trim() || user.username,
          avatar: safeAvatar,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        alert(data.message || "Ошибка сохранения");
        return;
      }

      const updatedUser = {
        ...user,
        ...data.user,
        avatar: data.user.avatar || safeAvatar || "",
      };

      setUser(updatedUser);
      setSelectedAvatarFile(null);
      setAvatarDirty(false);
      setNewName(updatedUser.username || "");
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("userChanged"));
      setEdit(false);
      alert("Профиль обновлён");
    } catch (err) {
      console.log("SAVE PROFILE ERROR:", err);
      alert("Ошибка сохранения");
    } finally {
      setSavingProfile(false);
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
      clickType: "followers",
    },
    {
      value: user.following || 0,
      label: "Подписки",
      icon: "➕",
      clickType: "following",
    },
    {
      value: stats.watched,
      label: "Просмотрено",
      icon: "🎬",
    },
    {
      value: stats.favorites,
      label: "Избранное",
      icon: "⭐",
    },
    ...(user.role === "admin" || user.role === "owner"
      ? [
          {
            value: stats.uploaded,
            label: "Загружено",
            icon: "📤",
          },
        ]
      : []),
  ];

  const renderAnimeGrid = (items, emptyText) => {
    if (!items.length) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-white/50">
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
            className="cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/10 transition hover:scale-[1.01]"
          >
            <img
              src={anime.image || "https://placehold.co/400x300?text=Anime"}
              alt={anime.title}
              className="h-48 w-full object-cover"
            />
            <div className="p-4">
              <p className="font-bold text-white">{anime.title}</p>
              <p className="mt-1 text-xs text-white/50">{anime.genre || "Без жанра"}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b18] text-white flex items-center justify-center">
        Загрузка профиля...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060816] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.avatar || getDefaultAvatar(user.username || "User")}
                alt="avatar"
                className="h-32 w-32 rounded-full border-4 border-white/20 object-cover shadow-2xl sm:h-36 sm:w-36"
              />
              {edit && (
                <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-pink-500 text-lg shadow-xl hover:scale-105">
                  📷
                  <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                </label>
              )}
            </div>

            <div className="flex-1 text-center lg:text-left">
              {edit ? (
                <div className="mt-2">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">
                    Изменить ник
                  </p>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={30}
                    className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30"
                    placeholder="Введите новый ник"
                  />
                </div>
              ) : (
                <h1 className="text-3xl font-extrabold sm:text-4xl">
                  {user.username || "Пользователь"}
                </h1>
              )}

              <p className="mt-2 break-all text-sm text-white/55 sm:text-base">{user.email}</p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <span
                  className={`inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest ${
                    roleBadge[user.role] || roleBadge.user
                  }`}
                >
                  {user.role}
                </span>

                {selectedAvatarFile && edit && (
                  <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs text-white/70">
                    Выбрано: {selectedAvatarFile.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-center gap-3 lg:flex-col">
              <button
                onClick={() => (edit ? saveProfile() : setEdit(true))}
                disabled={savingProfile}
                className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:scale-105 disabled:opacity-60"
              >
                {savingProfile ? "Сохранение..." : edit ? "Сохранить" : "Редактировать"}
              </button>

              {edit && (
                <button
                  onClick={() => {
                    setEdit(false);
                    setAvatarDirty(false);
                    setSelectedAvatarFile(null);
                    loadCurrentProfile({ silent: true });
                  }}
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white/85"
                >
                  Отмена
                </button>
              )}

              <button
                onClick={logout}
                className="rounded-2xl border border-red-500/30 bg-red-500/15 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/25"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>

        <div className={`mt-6 grid gap-4 ${statsCards.length === 5 ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4"}`}>
          {statsCards.map(({ value, label, icon, clickType }) => {
            const clickable = clickType === "followers" || clickType === "following";

            return (
              <button
                key={label}
                type="button"
                onClick={() => clickable && openConnectionsModal(clickType)}
                className={`rounded-2xl border border-white/10 bg-white/10 p-5 text-center shadow-xl ${
                  clickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="mb-2 text-3xl">{icon}</div>
                <div className="text-3xl font-extrabold text-white">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/55">
                  {label}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl">
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
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  tab === item.key
                    ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white"
                    : "border border-white/10 bg-white/10 text-white/85"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "profile" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Центр профиля</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
              Здесь можно менять ник, аватар, смотреть избранное и историю просмотра.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-bold text-white">Профиль</p>
                <div className="mt-3 space-y-2 text-sm text-white/70">
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

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-bold text-white">Архив</p>
                <div className="mt-3 space-y-2 text-sm text-white/70">
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

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-bold text-white">Подсказка</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-white/70">
                  <div className="rounded-2xl bg-white/5 px-3 py-3">
                    Для аватарки лучше выбирать обычную картинку JPG или PNG.
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-3">
                    После изменения нажми <span className="font-semibold text-white">Сохранить</span>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-extrabold sm:text-3xl">История просмотра</h2>
            {renderAnimeGrid(watchedAnime, "История просмотра пока пуста")}
          </div>
        )}

        {tab === "favorites" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
            <h2 className="mb-6 text-2xl font-extrabold sm:text-3xl">Избранное</h2>
            {renderAnimeGrid(favoriteAnime, "В избранном пока ничего нет")}
          </div>
        )}

        {tab === "admin" && user.role === "owner" && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5 sm:px-8">
              <h2 className="text-lg font-bold tracking-tight sm:text-xl">Панель управления</h2>
              <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
                {users.length} пользователей
              </span>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  placeholder="Поиск по email..."
                  value={searchEmail}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-white/30"
                />
                <button
                  onClick={handleSearchUser}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-3 text-sm font-semibold"
                >
                  Найти
                </button>
              </div>

              <div className="space-y-3">
                {displayUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={u.avatar || getDefaultAvatar(u.username || "User")}
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
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300"
                        >
                          + Admin
                        </button>
                      )}

                      {u.role === "admin" && (
                        <button
                          onClick={() => removeAdmin(u.id)}
                          className="rounded-xl border border-yellow-500/30 bg-yellow-500/20 px-3 py-2 text-xs font-semibold text-yellow-300"
                        >
                          Убрать
                        </button>
                      )}

                      <button
                        onClick={() => deleteUser(u.id)}
                        className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-300"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}

                {displayUsers.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-14 text-center text-sm text-white/40">
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
          onClick={closeConnectionsModal}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] shadow-[0_25px_90px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-7">
              <div>
                <h3 className="text-2xl font-extrabold text-white">{connectionsModal.title}</h3>
              </div>

              <button
                type="button"
                onClick={closeConnectionsModal}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl text-white/80"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-5 py-5 sm:px-7">
              {connectionsModal.loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-white/60">
                  Загрузка...
                </div>
              ) : connectionsModal.users.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-white/60">
                  Список пуст
                </div>
              ) : (
                <div className="space-y-3">
                  {connectionsModal.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => openUserProfile(u.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                    >
                      <img
                        src={u.avatar || getDefaultAvatar(u.username || "User")}
                        alt={u.username}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{u.username}</p>
                        <p className="truncate text-sm text-white/50">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;