import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";

import pool from "./db.js";

import authRoutes from "./routes/posts.js";
import animeRoutes from "./routes/anime.js";
import episodeRoutes from "./routes/episodes.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";
import notificationRoutes from "./routes/notifications.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://gargalib-frontend.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS error: origin not allowed"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", authRoutes);
app.use("/api/anime", animeRoutes);
app.use("/api/episodes", episodeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Gargalib backend is running");
});

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Файл или данные слишком большие",
    });
  }

  console.log("SERVER ERROR:", err);
  res.status(500).json({ message: "Ошибка сервера" });
});

async function initDatabase() {
  try {
    const schemaPath = path.join(process.cwd(), "schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf8");

    await pool.query(schemaSql);
    console.log("Database schema initialized successfully");
  } catch (error) {
    console.log("DATABASE INIT ERROR:", error);
    throw error;
  }
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.log("FAILED TO START SERVER:", error);
    process.exit(1);
  }
}

startServer();