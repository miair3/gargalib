import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const year = useMemo(() => new Date().getFullYear(), []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateUsername = (username) => {
    const usernameRegex = /^(?=.*[A-Za-z])[A-Za-z0-9]{6,16}$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/;
    return passwordRegex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateUsername(form.username)) {
      alert(
        "Логин должен быть от 6 до 16 символов, содержать буквы обязательно, цифры можно"
      );
      return;
    }

    if (!validatePassword(form.password)) {
      alert(
        "Пароль должен быть от 8 до 16 символов и обязательно содержать хотя бы 1 букву и 1 цифру"
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Пароли не совпадают");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("https://gargalib-backend.onrender.com/api/register", {
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

      alert("Регистрация успешна");
      navigate("/login");
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.2),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_26%),linear-gradient(135deg,#050816_0%,#140a24_35%,#241046_68%,#090b18_100%)]"></div>

        <div className="absolute -left-20 top-10 h-72 w-72 animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-pink-500/20 blur-[110px]"></div>
        <div className="absolute right-[-60px] top-20 h-80 w-80 animate-[pulse_10s_ease-in-out_infinite] rounded-full bg-violet-500/20 blur-[120px]"></div>
        <div className="absolute bottom-[-70px] left-1/2 h-96 w-96 -translate-x-1/2 animate-[pulse_9s_ease-in-out_infinite] rounded-full bg-cyan-400/20 blur-[140px]"></div>

        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:44px_44px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.06] shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden min-h-[820px] overflow-hidden lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-violet-500/10"></div>

            <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-orange-200 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_14px_rgba(253,186,116,1)]"></span>
                  GarGaLib
                </div>

                <h1 className="mt-7 max-w-xl text-5xl font-black leading-[1.02] text-white xl:text-6xl">
                  Создайте свой
                  <span className="mt-2 block bg-gradient-to-r from-orange-300 via-pink-400 to-violet-300 bg-clip-text text-transparent">
                    аниме-аккаунт
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-base leading-8 text-slate-300 xl:text-lg">
                  GarGaLib создан для просмотра аниме, общения с другими
                  пользователями, сохранения избранного, отслеживания просмотренных
                  тайтлов и удобного хранения своей аниме-коллекции.
                </p>
              </div>

              <div className="relative my-6 overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 via-pink-500/5 to-violet-500/10"></div>
                <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-orange-400/20 blur-3xl"></div>
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-violet-500/20 blur-3xl"></div>

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-orange-200">
                        Inside GarGaLib
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-white">
                        Ваш аниме-мир в одном месте
                      </h3>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-pink-200">
                      LIVE
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="group rounded-[24px] border border-white/10 bg-black/20 p-4 transition duration-300 hover:-translate-y-1 hover:bg-black/30">
                      <div className="overflow-hidden rounded-2xl border border-white/10">
                        <img
                          src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80"
                          alt="anime preview"
                          className="h-36 w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-4 text-lg font-bold text-white">
                        Смотреть аниме
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Открывайте новые тайтлы, собирайте свою коллекцию и
                        сохраняйте любимые серии.
                      </p>
                    </div>

                    <div className="group rounded-[24px] border border-white/10 bg-black/20 p-4 transition duration-300 hover:-translate-y-1 hover:bg-black/30">
                      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/20 text-lg">
                              💬
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                Живое общение
                              </p>
                              <p className="text-xs text-slate-400">
                                Чаты, комментарии и реакции
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-lg">
                              ⭐
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                Избранное
                              </p>
                              <p className="text-xs text-slate-400">
                                Всё любимое всегда рядом
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-lg">
                              👤
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                Красивый профиль
                              </p>
                              <p className="text-xs text-slate-400">
                                Ваша личная аниме-страница
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 text-lg font-bold text-white">
                        Общайтесь и делитесь
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Не просто просмотр, а полноценное сообщество внутри
                        GarGaLib.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-xl">
                      ⭐
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Сохраняйте избранное
                      </p>
                      <p className="text-xs text-slate-400">
                        Любимые аниме всегда будут под рукой
                      </p>
                    </div>
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-xl">
                      💬
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Общайтесь и делитесь
                      </p>
                      <p className="text-xs text-slate-400">
                        Профили, комментарии, реакции и чат
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl">
                  <p className="text-sm font-semibold text-white">После регистрации</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Вы сможете войти в профиль, начать собирать свою коллекцию,
                    смотреть аниме и пользоваться всеми возможностями сайта.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[820px] items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_58%)]"></div>

            <div className="relative w-full max-w-md">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.07] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
                <div className="text-center lg:text-left">
                  <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-pink-200 lg:mx-0">
                    <span className="h-2 w-2 rounded-full bg-pink-300 shadow-[0_0_14px_rgba(249,168,212,1)]"></span>
                    Register
                  </div>

                  <h2 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl">
                    Создать аккаунт
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                    Зарегистрируйтесь, чтобы получить доступ к профилю,
                    избранному, просмотру аниме и другим возможностям GarGaLib.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Логин
                    </label>
                    <div
                      className={`group rounded-2xl border bg-white/5 transition duration-300 ${
                        focusedField === "username"
                          ? "border-orange-400/50 shadow-[0_0_0_4px_rgba(251,146,60,0.08)]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4">
                        <span className="text-lg text-slate-400 transition group-focus-within:text-orange-300">
                          👤
                        </span>
                        <input
                          type="text"
                          name="username"
                          value={form.username}
                          onChange={handleChange}
                          onFocus={() => setFocusedField("username")}
                          onBlur={() => setFocusedField("")}
                          placeholder="Логин 6-16 символов"
                          required
                          className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Только буквы и цифры, минимум одна буква
                    </p>
                  </div>

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
                          placeholder="Пароль 8-16 символов"
                          required
                          className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Хотя бы одна буква и одна цифра
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Повтор пароля
                    </label>
                    <div
                      className={`group rounded-2xl border bg-white/5 transition duration-300 ${
                        focusedField === "confirmPassword"
                          ? "border-violet-400/50 shadow-[0_0_0_4px_rgba(167,139,250,0.08)]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4">
                        <span className="text-lg text-slate-400 transition group-focus-within:text-violet-300">
                          ✅
                        </span>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          onFocus={() => setFocusedField("confirmPassword")}
                          onBlur={() => setFocusedField("")}
                          placeholder="Повторите пароль"
                          required
                          className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 px-5 py-4 text-sm font-bold text-white shadow-[0_18px_45px_rgba(168,85,247,0.35)] transition duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                  >
                    <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.22),transparent)] opacity-0 transition duration-700 group-hover:translate-x-full group-hover:opacity-100"></span>
                    <span className="relative">
                      {loading ? "Создание..." : "Зарегистрироваться"}
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
                    Уже есть аккаунт?{" "}
                    <Link
                      to="/login"
                      className="font-semibold text-pink-300 transition hover:text-pink-200 hover:underline"
                    >
                      Войти
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

export default Register;