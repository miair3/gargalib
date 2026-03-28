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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
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

      const nextMessages = Array.isArray(data) ? data : [];

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
          senderId: currentUserId,
          receiverId: selectedUserId,
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
          body: JSON.stringify({ userId: currentUserId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("DELETE MESSAGE ERROR:", data);
        return;
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === activeMessage.id ? data : msg))
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
            userId: currentUserId,
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
        prev.map((msg) => (msg.id === editingMessageId ? data : msg))
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
          body: JSON.stringify({ userId: currentUserId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.log("RESTORE MESSAGE ERROR:", data);
        return;
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === activeMessage.id ? data : msg))
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
      <div className="min-h-screen flex items-center justify-center bg-[#060816] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/10 px-8 py-5 backdrop-blur-2xl shadow-2xl">
          Пользователь не найден
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070b18] via-[#151a43] to-[#3e0f60] p-4 text-white">
      <div className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm"
            >
              Назад
            </button>

            <img
              src={
                selectedUser.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  selectedUser.username || "User"
                )}`
              }
              alt={selectedUser.username}
              className="h-12 w-12 rounded-full object-cover"
            />

            <div>
              <div className="font-bold">{selectedUser.username || "Пользователь"}</div>
              <div className="text-xs text-white/50">{selectedUser.email || ""}</div>
            </div>
          </div>

          <button
            onClick={handleDeleteDialog}
            className="rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm text-red-300"
          >
            Очистить чат
          </button>
        </div>

        <div className="h-[60vh] overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-white/50">
                Сообщений пока нет
              </div>
            )}

            {messages.map((msg) => {
              const isMine = String(msg.senderId ?? msg.sender_id) === currentUserId;
              const isDeleted = Boolean(msg.deleted);

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  onContextMenu={(e) => openMessageMenu(e, msg)}
                  onTouchStart={() => startHold(msg)}
                  onTouchEnd={stopHold}
                  onTouchCancel={stopHold}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
                      isMine
                        ? "bg-pink-500/80 text-white"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none"
                        />
                        {editError && (
                          <div className="text-xs text-red-300">{editError}</div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEditedMessage}
                            disabled={isEditTooLong}
                            className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded-xl bg-white/10 px-3 py-2 text-sm"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`${isDeleted ? "italic text-white/50" : ""}`}>
                          {isDeleted
                            ? msg.text || "Сообщение удалено"
                            : msg.text || ""}
                        </div>
                        <div className="mt-2 text-right text-[11px] text-white/50">
                          {msg.created_at || msg.createdAt || msg.createdAt
                            ? formatTime(msg.created_at || msg.createdAt)
                            : ""}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3">
            <textarea
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (sendError) setSendError("");
              }}
              placeholder="Введите сообщение..."
              className="min-h-[90px] w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none placeholder:text-white/30"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-white/50">
                {[...messageText].length}/{MAX_MESSAGE_LENGTH}
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isTooLong}
                className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Отправить
              </button>
            </div>

            {sendError && <div className="text-sm text-red-300">{sendError}</div>}
          </div>
        </div>

        {showMessageMenu && activeMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0c1124] p-4 shadow-2xl">
              <div className="mb-4 text-lg font-bold text-white">Действия</div>

              <div className="space-y-2">
                {canEditMessage && (
                  <button
                    onClick={handleStartEditMessage}
                    className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left"
                  >
                    Редактировать
                  </button>
                )}

                {canDeleteMessage && (
                  <button
                    onClick={handleDeleteMessage}
                    className="w-full rounded-2xl bg-red-500/20 px-4 py-3 text-left text-red-300"
                  >
                    Удалить
                  </button>
                )}

                {canRestoreMessage && (
                  <button
                    onClick={handleRestoreDeletedMessage}
                    className="w-full rounded-2xl bg-emerald-500/20 px-4 py-3 text-left text-emerald-300"
                  >
                    Восстановить
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowMessageMenu(false);
                    setActiveMessage(null);
                  }}
                  className="w-full rounded-2xl bg-white/10 px-4 py-3 text-left"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;