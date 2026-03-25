import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const year = useMemo(() => new Date().getFullYear(), []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isUserStillBanned = (user) => {
    if (!user?.isBanned) return false;

    if (!user.banUntil) return true;

    const now = Date.now();
    const banEnd = new Date(user.banUntil).getTime();

    return now < banEnd;
  };

  const clearExpiredBan = async (user) => {
    if (!user?.isBanned || !user?.banUntil) return user;

    const now = Date.now();
    const banEnd = new Date(user.banUntil).getTime();

    if (now >= banEnd) {
      try {
        const userId = user.id || user._id;

        if (!userId) return user;

        const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isBanned: false,
            banReason: "",
            banUntil: null,
          }),
        });

        if (res.ok) {
          return {
            ...user,
            isBanned: false,
            banReason: "",
            banUntil: null,
          };
        }
      } catch (err) {
        console.log("Ошибка при авторазбане:", err);
      }
    }

    return user;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.message) {
        alert(data.message);
        return;
      }

      let user = data.user;

      user = await clearExpiredBan(user);

      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify(user));

      window.dispatchEvent(new Event("userChanged"));

      if (isUserStillBanned(user)) {
        navigate("/banned");
        return;
      }

      navigate("/home");
    } catch (err) {
      console.log(err);
      alert("Ошибка сервера");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060816] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.16),transparent_26%),linear-gradient(135deg,#050816_0%,#0f1230_42%,#241046_72%,#090b18_100%)]"></div>

        <div className="absolute -left-20 top-10 h-72 w-72 animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-fuchsia-500/20 blur-[110px]"></div>
        <div className="absolute right-[-60px] top-20 h-80 w-80 animate-[pulse_10s_ease-in-out_infinite] rounded-full bg-cyan-400/20 blur-[120px]"></div>
        <div className="absolute bottom-[-80px] left-1/2 h-96 w-96 -translate-x-1/2 animate-[pulse_9s_ease-in-out_infinite] rounded-full bg-violet-500/20 blur-[140px]"></div>

        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:44px_44px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.06] shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[760px] overflow-hidden lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-400/10"></div>

            <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-fuchsia-200 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_14px_rgba(244,114,182,1)]"></span>
                  GarGaLib
                </div>

                <h1 className="mt-7 max-w-xl text-5xl font-black leading-[1.02] text-white xl:text-6xl">
                  Добро пожаловать в
                  <span className="mt-2 block bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                    мир аниме
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-8 text-slate-300 xl:text-lg">
                  GarGaLib создан для просмотра аниме, поиска любимых тайтлов,
                  общения с другими пользователями, добавления серий и удобного
                  хранения своей аниме-коллекции в одном красивом месте.
                </p>
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 text-xl">
                      🎴
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Смотреть аниме
                      </p>
                      <p className="text-xs text-slate-400">
                        Серии, коллекции и любимые тайтлы
                      </p>
                    </div>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-xl">
                      💬
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Общаться и делиться
                      </p>
                      <p className="text-xs text-slate-400">
                        Комментарии, чат и взаимодействие с людьми
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                  <p className="text-sm font-semibold text-white">
                    О сайте
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Это место, где можно не только смотреть аниме, но и вести
                    свой профиль, сохранять избранное, следить за просмотренным
                    и загружать новые серии.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[760px] items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_58%)]"></div>

            <div className="relative w-full max-w-md">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.07] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
                <div className="text-center lg:text-left">
                  <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200 lg:mx-0">
                    <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,1)]"></span>
                    Login
                  </div>

                  <h2 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl">
                    Вход в аккаунт
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                    Войдите, чтобы продолжить просмотр аниме, открыть профиль,
                    избранное и ваши серии.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Email
                    </label>
                    <div
                      className={`group rounded-2xl border bg-white/5 transition duration-300 ${
                        focusedField === "email"
                          ? "border-pink-400/50 shadow-[0_0_0_4px_rgba(236,72,153,0.08)]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4">
                        <span className="text-lg text-slate-400 transition group-focus-within:text-pink-300">
                          ✉
                        </span>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField("")}
                          placeholder="Введите ваш email"
                          required
                          className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Пароль
                    </label>
                    <div
                      className={`group rounded-2xl border bg-white/5 transition duration-300 ${
                        focusedField === "password"
                          ? "border-cyan-400/50 shadow-[0_0_0_4px_rgba(34,211,238,0.08)]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4">
                        <span className="text-lg text-slate-400 transition group-focus-within:text-cyan-300">
                          🔒
                        </span>
                        <input
                          type="password"
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          onFocus={() => setFocusedField("password")}
                          onBlur={() => setFocusedField("")}
                          placeholder="Введите пароль"
                          required
                          className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-5 py-4 text-sm font-bold text-white shadow-[0_18px_45px_rgba(168,85,247,0.35)] transition duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                  >
                    <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.22),transparent)] opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100"></span>
                    <span className="relative">
                      {loading ? "Вход..." : "Войти"}
                    </span>
                  </button>
                </form>

                <div className="mt-7">
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-transparent px-3 text-xs uppercase tracking-[0.28em] text-slate-500">
                        GarGaLib
                      </span>
                    </div>
                  </div>

                  <p className="mt-5 text-center text-sm text-slate-300">
                    Нет аккаунта?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-pink-300 transition hover:text-pink-200 hover:underline"
                    >
                      Регистрация
                    </Link>
                  </p>
                </div>
              </div>

              <div className="mt-5 text-center text-xs tracking-[0.22em] text-slate-500">
                © {year} GAR GALIB
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;