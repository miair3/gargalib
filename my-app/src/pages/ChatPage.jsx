import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "https://gargalib-backend.onrender.com";
const MAX_MESSAGE_LENGTH = 4096;

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("currentUser"));
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState("");

  const [activeMessage, setActiveMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editError, setEditError] = useState("");

  const endRef = useRef(null);
  const holdTimerRef = useRef(null);

  const getTargetUserId = () => {
    const params = new URLSearchParams(location.search);
    return params.get("user");
  };

  const getSafeUserId = (user) => {
    return String(user?.id ?? user?._id ?? "");
  };

  const selectedUserId = getSafeUserId(selectedUser);
  const currentUserId = getSafeUserId(currentUser);
  const isOwner = currentUser?.role === "owner";

  const isTooLong = [...messageText].length > MAX_MESSAGE_LENGTH;
  const isEditTooLong = [...editingText].length > MAX_MESSAGE_LENGTH;

  const normalizeMessage = (msg) => ({
    ...msg,
    id: msg.id,
    senderId: String(msg.senderId ?? msg.sender_id ?? ""),
    receiverId: String(msg.receiverId ?? msg.receiver_id ?? ""),
    text: msg.text ?? "",
    originalText: msg.originalText ?? msg.original_text ?? msg.text ?? "",
    deleted: Boolean(msg.deleted),
    edited: Boolean(msg.edited),
    read: Boolean(msg.read ?? msg.is_read),
    createdAt: msg.createdAt ?? msg.created_at ?? null,
  });

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadMessages = async () => {
    if (!currentUserId || !selectedUserId) {
      setMessages([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${currentUserId}/${selectedUserId}?t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("LOAD MESSAGES ERROR:", data);
        return;
      }

      const nextMessages = Array.isArray(data)
        ? data.map(normalizeMessage)
        : [];

      setMessages((prev) => {
        const prevStr = JSON.stringify(prev);
        const nextStr = JSON.stringify(nextMessages);
        return prevStr === nextStr ? prev : nextMessages;
      });
    } catch (err) {
      console.log("LOAD MESSAGES ERROR:", err);
    }
  };

  useEffect(() => {
    const loadSelectedUser = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const targetUserId = getTargetUserId();

      if (!targetUserId) {
        setSelectedUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/api/users/${targetUserId}`);
        const data = await res.json();

        if (!res.ok || data.message) {
          setSelectedUser(null);
          return;
        }

        setSelectedUser({
          ...data,
          avatar:
            data.avatar ||
            localStorage.getItem(`avatar_${data.id || data._id}`) ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              data.username || "User"
            )}`,
        });
      } catch (err) {
        console.log("CHAT USER LOAD ERROR:", err);
        setSelectedUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedUser();
  }, [location.search]);

  useEffect(() => {
    if (!selectedUserId || !currentUserId) return;

    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 1000);

    const handleFocus = () => {
      loadMessages();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedUserId, currentUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const closeMenu = () => setShowMessageMenu(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();

    if (!trimmed || !currentUserId || !selectedUserId) return;

    if ([...trimmed].length > MAX_MESSAGE_LENGTH) {
      setSendError(`Сообщение не должно превышать ${MAX_MESSAGE_LENGTH} символов`);
      return;
    }

    try {
      setSendError("");

      const res = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: Number(currentUserId),
          receiverId: Number(selectedUserId),
          text: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data.message || "Ошибка отправки");
        console.log("SEND MESSAGE ERROR:", data);
        return;
      }

      setMessageText("");
      await loadMessages();
    } catch (err) {
      console.log("SEND MESSAGE ERROR:", err);
      setSendError("Ошибка отправки");
    }
  };

  const handleDeleteDialog = async () => {
    if (!currentUserId || !selectedUserId) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/dialog/${currentUserId}/${selectedUserId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("DELETE DIALOG ERROR:", data);
        return;
      }

      setMessages([]);
    } catch (err) {
      console.log("DELETE DIALOG ERROR:", err);
    }
  };

  const openMessageMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMessage(msg);
    setShowMessageMenu(true);
  };

  const startHold = (msg) => {
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      setActiveMessage(msg);
      setShowMessageMenu(true);
    }, 500);
  };

  const stopHold = () => {
    clearTimeout(holdTimerRef.current);
  };

  const handleDeleteMessage = async () => {
    if (!activeMessage) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${activeMessage.id}/delete`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: Number(currentUserId) }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("DELETE MESSAGE ERROR:", data);
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === activeMessage.id ? normalizeMessage(data) : msg
        )
      );
      setShowMessageMenu(false);
      setActiveMessage(null);

      if (editingMessageId === activeMessage.id) {
        setEditingMessageId(null);
        setEditingText("");
        setEditError("");
      }
    } catch (err) {
      console.log("DELETE MESSAGE ERROR:", err);
    }
  };

  const handleStartEditMessage = () => {
    if (!activeMessage || activeMessage.deleted) return;
    setEditingMessageId(activeMessage.id);
    setEditingText(activeMessage.originalText || activeMessage.text || "");
    setEditError("");
    setShowMessageMenu(false);
  };

  const handleSaveEditedMessage = async () => {
    const trimmed = editingText.trim();

    if (!trimmed || !editingMessageId) return;

    if ([...trimmed].length > MAX_MESSAGE_LENGTH) {
      setEditError(`Сообщение не должно превышать ${MAX_MESSAGE_LENGTH} символов`);
      return;
    }

    try {
      setEditError("");

      const res = await fetch(
        `${API_BASE}/api/messages/${editingMessageId}/edit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: Number(currentUserId),
            text: trimmed,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.message || "Ошибка редактирования");
        console.log("EDIT MESSAGE ERROR:", data);
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessageId ? normalizeMessage(data) : msg
        )
      );
      setEditingMessageId(null);
      setEditingText("");
      setEditError("");
      await loadMessages();
    } catch (err) {
      console.log("EDIT MESSAGE ERROR:", err);
      setEditError("Ошибка редактирования");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
    setEditError("");
  };

  const handleRestoreDeletedMessage = async () => {
    if (!activeMessage || !isOwner || !activeMessage.deleted) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/messages/${activeMessage.id}/restore`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: Number(currentUserId) }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("RESTORE MESSAGE ERROR:", data);
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === activeMessage.id ? normalizeMessage(data) : msg
        )
      );
      setShowMessageMenu(false);
      setActiveMessage(null);
      await loadMessages();
    } catch (err) {
      console.log("RESTORE MESSAGE ERROR:", err);
    }
  };

  const canEditMessage =
    activeMessage &&
    String(activeMessage.senderId) === currentUserId &&
    !activeMessage.deleted;

  const canDeleteMessage =
    activeMessage &&
    (String(activeMessage.senderId) === currentUserId || isOwner);

  const canRestoreMessage = activeMessage && activeMessage.deleted && isOwner;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060816] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-5 backdrop-blur-2xl shadow-2xl">
          Сначала войдите в аккаунт
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b18] via-[#151a43] to-[#3e0f60] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-5 backdrop-blur-2xl shadow-2xl">
          Загрузка чата...
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b18] via-[#151a43] to-[#3e0f60] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-5 backdrop-blur-2xl shadow-2xl">
          Пользователь не найден
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#070b18] via-[#151a43] to-[#3e0f60] text-white">
      <div className="absolute left-6 top-10 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl"></div>
      <div className="absolute right-10 top-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"></div>
      <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"></div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Личный чат
            </h1>
            <p className="mt-1 text-sm text-slate-300 sm:text-base">
              Переписка с {selectedUser.username}
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Назад
          </button>
        </div>

        <div className="flex h-[80vh] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/5 px-5 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <img
                  src={
                    selectedUser.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      selectedUser.username || "User"
                    )}`
                  }
                  alt={selectedUser.username}
                  className="h-14 w-14 rounded-full border border-white/10 object-cover"
                />
                <span
                  className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#1c214f] ${
                    selectedUser.is_online ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                ></span>
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-white sm:text-xl">
                  {selectedUser.username}
                </h2>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {selectedUser.is_online ? "Сейчас в сети" : "Не в сети"}
                </p>
              </div>
            </div>

            <button
              onClick={handleDeleteDialog}
              className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Очистить чат
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          >
            {messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = String(msg.senderId) === currentUserId;
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        onContextMenu={(e) => openMessageMenu(e, msg)}
                        onTouchStart={() => startHold(msg)}
                        onTouchEnd={stopHold}
                        onTouchMove={stopHold}
                        onMouseDown={() => startHold(msg)}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        className={`max-w-[85%] rounded-[22px] px-3 py-2 shadow-xl sm:max-w-[72%] ${
                          isMine
                            ? "rounded-br-md bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white"
                            : "rounded-bl-md border border-white/10 bg-white/10 text-white backdrop-blur-xl"
                        } ${msg.deleted ? "opacity-80 italic" : ""}`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <textarea
                              value={editingText}
                              onChange={(e) => {
                                setEditingText(e.target.value);
                                if (editError) setEditError("");
                              }}
                              rows={3}
                              className="w-full resize-none rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                            />

                            {editError && (
                              <p className="text-xs text-red-300">{editError}</p>
                            )}

                            <div className="flex justify-end gap-2">
                              <button
                                onClick={handleCancelEdit}
                                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={handleSaveEditedMessage}
                                disabled={!editingText.trim() || isEditTooLong}
                                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p
                              className={`whitespace-pre-wrap break-words text-[15px] leading-5 sm:text-[16px] ${
                                msg.deleted ? "text-white/80" : ""
                              }`}
                            >
                              {msg.text}
                            </p>

                            <div className="mt-1.5 flex items-center justify-end gap-2 text-[11px] text-white/70">
                              <span>{formatTime(msg.createdAt)}</span>
                              {msg.edited && !msg.deleted && <span>Изменено</span>}
                              {isMine && !msg.deleted && (
                                <span>{msg.read ? "Прочитано" : "Отправлено"}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div className="rounded-[28px] border border-white/10 bg-white/10 px-8 py-8 backdrop-blur-xl">
                  <h3 className="text-xl font-bold text-white sm:text-2xl">
                    Чат пуст
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 sm:text-base">
                    Напишите первое сообщение пользователю {selectedUser.username}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-white/5 p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    if (sendError) setSendError("");
                  }}
                  placeholder={`Сообщение для ${selectedUser.username}...`}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="max-h-36 min-h-[54px] w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-400 focus:border-pink-400/40 focus:bg-white/15"
                />

                {sendError && (
                  <p className="mt-2 text-xs text-red-300">{sendError}</p>
                )}
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isTooLong}
                className={`rounded-2xl px-6 py-3 text-sm font-bold transition duration-300 ${
                  messageText.trim() && !isTooLong
                    ? "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white shadow-xl shadow-fuchsia-900/30 hover:scale-105"
                    : "cursor-not-allowed bg-white/10 text-slate-500"
                }`}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMessageMenu && activeMessage && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowMessageMenu(false)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#171b43]/95 p-4 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm text-slate-300">Действия с сообщением</p>

            <div className="space-y-2">
              {canEditMessage && (
                <button
                  onClick={handleStartEditMessage}
                  className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Изменить сообщение
                </button>
              )}

              {canDeleteMessage && (
                <button
                  onClick={handleDeleteMessage}
                  className="w-full rounded-2xl bg-red-500/20 px-4 py-3 text-left text-sm font-semibold text-red-200 transition hover:bg-red-500/30"
                >
                  Удалить сообщение
                </button>
              )}

              {canRestoreMessage && (
                <button
                  onClick={handleRestoreDeletedMessage}
                  className="w-full rounded-2xl bg-emerald-500/20 px-4 py-3 text-left text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
                >
                  Восстановить сообщение
                </button>
              )}

              <button
                onClick={() => setShowMessageMenu(false)}
                className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;