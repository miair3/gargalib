import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/posts.js";
import animeRoutes from "./routes/anime.js";
import episodeRoutes from "./routes/episodes.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";
import notificationRoutes from "./routes/notifications.js";

const app = express();

app.use(cors());

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", authRoutes);
app.use("/api/anime", animeRoutes);
app.use("/api/episodes", episodeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Файл или данные слишком большие",
    });
  }

  console.log("SERVER ERROR:", err);
  res.status(500).json({ message: "Ошибка сервера" });
});

app.listen(5000, () => {
  console.log("Server started on port 5000");
});