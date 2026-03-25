import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b1020] via-[#1a1f4d] to-[#3a0f5d] text-white">
      <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl"></div>
      <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"></div>
      <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl"></div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-pink-200 backdrop-blur-md shadow-lg shadow-pink-500/10">
              Добро пожаловать в аниме-мир
            </span>

            <h1 className="mt-6 text-5xl font-extrabold leading-tight sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                GarGaLib
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
              Платформа для настоящих любителей аниме. Смотри любимые тайтлы,
              сохраняй коллекции, открывай новые миры и наслаждайся стильным
              интерфейсом в атмосфере японской эстетики.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 px-7 py-4 font-semibold text-white shadow-2xl shadow-fuchsia-900/40 transition duration-300 hover:scale-105 hover:shadow-pink-500/30"
              >
                Зарегистрироваться
              </Link>

              <Link
                to="/login"
                className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur-md transition duration-300 hover:scale-105 hover:bg-white/15"
              >
                Войти
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur-xl shadow-2xl shadow-black/40">
              <div className="rounded-[28px] bg-gradient-to-br from-white/10 to-white/5 p-6">
                <h2 className="text-2xl font-bold text-white">Почему GarGaLib?</h2>
                <div className="mt-6 space-y-4">
                  {[
                    "Большая библиотека аниме",
                    "Красивый современный интерфейс",
                    "Сохранение любимых тайтлов",
                    "Новинки сезонов и популярные релизы",
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-slate-100 shadow-md"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-pink-400/20 bg-gradient-to-r from-pink-500/10 to-cyan-400/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-pink-200">
                    Anime Experience
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    Стиль. Атмосфера. Любимые истории.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
