import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const AddEpisode = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [episodeNumber, setEpisodeNumber] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("currentUser"));

  const saveUploadedEpisodeToLocal = (currentUserId, episodeData) => {
    try {
      const key = `uploaded_${currentUserId}`;
      const existing = JSON.parse(localStorage.getItem(key)) || [];

      const preparedItem = {
        id: episodeData?.id || Date.now(),
        animeId: Number(id),
        episodeNumber: Number(episodeNumber),
        videoName: videoFile?.name || "",
        createdAt: new Date().toISOString(),
      };

      const updated = [...existing, preparedItem];
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("userChanged"));
    } catch (err) {
      console.log("LOCAL UPLOAD SAVE ERROR:", err);
    }
  };

  const handleSubmit = async () => {
    if (!episodeNumber || !videoFile) {
      alert("Заполни все поля и выбери видео");
      return;
    }

    const currentUserId = user?.id || user?._id;

    if (!currentUserId) {
      alert("Не найден пользователь");
      return;
    }

    const formData = new FormData();
    formData.append("animeId", id);
    formData.append("episodeNumber", episodeNumber);
    formData.append("userId", currentUserId);
    formData.append("video", videoFile);

    try {
      setLoading(true);

      const res = await fetch("https://gargalib-backend.onrender.com/api/episodes", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || "Ошибка загрузки");
        return;
      }

      saveUploadedEpisodeToLocal(currentUserId, data);

      alert("Серия добавлена 🔥");
      navigate(`/anime/${id}`);
    } catch (err) {
      console.log(err);
      alert("Ошибка сервера");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#070b18] via-[#17153b] to-[#3b0f5c] px-4 py-10 text-white">
      <div className="pointer-events-none absolute left-[-40px] top-10 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl"></div>
      <div className="pointer-events-none absolute right-[-30px] top-24 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl"></div>

      <div className="relative mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:grid-cols-[1fr_430px]">
          <div className="relative hidden overflow-hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-fuchsia-500/10 to-cyan-400/20"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_30%)]"></div>

            <div className="relative flex h-full flex-col justify-between p-10">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-pink-200">
                  GarGaLib Upload
                </p>
                <h1 className="mt-5 max-w-md bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-5xl font-extrabold leading-tight text-transparent">
                  Добавьте новую серию красиво
                </h1>
                <p className="mt-5 max-w-md text-base leading-8 text-slate-200">
                  Загрузите видеофайл, укажите номер серии и сразу отправьте его
                  в карточку аниме.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                  <p className="text-sm text-slate-300">Что можно загрузить</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-pink-200">
                      MP4
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                      WEBM
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-200">
                      OGG
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-slate-300">Совет</p>
                  <p className="mt-2 text-sm leading-7 text-white/90">
                    Лучше загружать файл с понятным названием, чтобы потом было
                    легче ориентироваться в сериях.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <p className="text-xs uppercase tracking-[0.3em] text-pink-200 lg:hidden">
                  GarGaLib Upload
                </p>
                <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                  Добавить серию
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Заполните данные ниже и загрузите видеофайл серии.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-pink-200">
                    Номер серии
                  </label>
                  <input
                    type="number"
                    placeholder="Например: 1"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-400 focus:border-pink-400/40 focus:bg-black/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-pink-200">
                    Видео серии
                  </label>

                  <label className="group flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-black/25 px-5 py-6 text-center transition hover:border-pink-400/30 hover:bg-black/35">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-2xl">
                      🎬
                    </div>

                    <p className="text-sm font-semibold text-white">
                      {videoFile ? videoFile.name : "Нажмите, чтобы выбрать видео"}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Поддержка: .mp4, .webm, .ogg
                    </p>

                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      onChange={(e) => setVideoFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                  Аниме ID: <span className="font-bold">{id}</span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-2xl shadow-fuchsia-900/30 transition duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loading ? "Загрузка..." : "Добавить серию"}
                </button>

                <button
                  onClick={() => navigate(`/anime/${id}`)}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Назад к аниме
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEpisode;