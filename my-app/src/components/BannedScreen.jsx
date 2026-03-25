import React from "react";
import { useNavigate } from "react-router-dom";

const BannedScreen = ({ reason, until }) => {
  const navigate = useNavigate();

  const formatBanDate = (date) => {
    if (!date) return "Навсегда";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Навсегда";
    }

    return parsed.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#070b18] via-[#1a1446] to-[#3b0f5c] px-6 py-10 text-white">
      <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-red-500/20 blur-3xl"></div>
      <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl"></div>
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-2xl rounded-[34px] border border-red-400/20 bg-white/10 p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-5xl shadow-lg shadow-red-900/20">
            🚫
          </div>

          <p className="mt-6 text-sm uppercase tracking-[0.35em] text-red-200">
            Access Restricted
          </p>

          <h1 className="mt-4 bg-gradient-to-r from-red-400 via-pink-300 to-fuchsia-300 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
            Вы забанены
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            Ваш аккаунт временно или навсегда ограничен. Просмотр аниме и доступ
            к части функций сайта сейчас недоступен.
          </p>
        </div>

        <div className="mt-8 rounded-[28px] border border-red-400/15 bg-black/20 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">Причина</p>
              <p className="mt-2 break-words text-base font-semibold text-white">
                {reason || "Не указана"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">Срок бана</p>
              <p className="mt-2 break-words text-base font-semibold text-white">
                {formatBanDate(until)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-red-400/10 bg-red-500/5 p-4 text-sm leading-7 text-slate-300">
            Если вы считаете, что бан выдан ошибочно, обратитесь к администрации
            сайта.
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/home")}
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-semibold text-white transition hover:scale-[1.02] hover:bg-white/15"
          >
            На главную
          </button>

          <button
            onClick={() => navigate("/profile")}
            className="w-full rounded-2xl bg-gradient-to-r from-red-500 via-pink-500 to-violet-500 px-5 py-3 font-semibold text-white shadow-xl shadow-red-900/20 transition hover:scale-[1.02]"
          >
            Мой профиль
          </button>
        </div>
      </div>
    </div>
  );
};

export default BannedScreen;