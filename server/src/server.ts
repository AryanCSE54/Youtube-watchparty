import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { RoomManager } from "./rooms/RoomManager.js";
import { registerSocketHandlers } from "./socket/socketHandlers.js";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 3001;
const allowedOrigin = process.env.CLIENT_URL || "https://youtube-watchparty-ashy.vercel.app";

app.use(cors({ origin: allowedOrigin.split(",").map(s => s.trim()), credentials: true }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok", service: "youtube-watch-party-server" }));

const io = new Server(httpServer, {
  cors: { origin: allowedOrigin.split(",").map(s => s.trim()), methods: ["GET", "POST"] },
  pingInterval: 25000,
  pingTimeout: 20000
});
const rooms = new RoomManager();

io.on("connection", socket => {
  console.log(`Socket connected: ${socket.id}`);
  registerSocketHandlers(io, socket, rooms);
});

httpServer.listen(port, "0.0.0.0", () => console.log(`WatchParty server listening on port ${port}`));
