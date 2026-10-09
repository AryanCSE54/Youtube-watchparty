import type { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import type { RoomManager } from "../rooms/RoomManager.js";
import type { Role } from "../models/Room.js";

const ROOM_ID_PATTERN = /^[A-Z0-9]{4,8}$/;
const VALID_ROLES: Role[] = ["Moderator", "Participant", "Viewer"];

export function registerSocketHandlers(io: Server, socket: Socket, rooms: RoomManager) {
  const currentRoomId = () => [...socket.rooms].find(id => id !== socket.id);
  const roomFor = (roomId: string) => {
    const room = rooms.getRoom(roomId);
    if (!room || !socket.rooms.has(room.id)) return undefined;
    return room;
  };
  const error = (message: string) => socket.emit("room_error", { message });
  const broadcastState = (roomId: string, room: NonNullable<ReturnType<typeof rooms.getRoom>>) => {
    io.to(roomId).emit("sync_state", room.state);
  };

  socket.on("create_room", ({ username }, callback) => {
    if (typeof username !== "string" || !username.trim()) { callback({ error: "Enter a display name." }); return; }
    const room = rooms.createRoom();
    room.addParticipant(socket.id, username, "Host");
    socket.join(room.id);
    socket.data.username = username.trim().slice(0, 30);
    socket.emit("room_joined", { roomId: room.id, userId: socket.id, role: "Host", participants: room.getParticipantList(), state: room.state });
    callback({ roomId: room.id });
  });

  socket.on("join_room", ({ roomId, username }, callback) => {
    if (typeof roomId !== "string" || !ROOM_ID_PATTERN.test(roomId.toUpperCase())) {
      callback?.({ ok: false, error: "Room code must be 4–8 letters or numbers." }); return;
    }
    if (typeof username !== "string" || !username.trim()) { callback?.({ ok: false, error: "Enter a display name." }); return; }
    const id = roomId.toUpperCase();
    const room = rooms.getRoom(id);
    if (!room) { callback?.({ ok: false, error: "Room not found. Check the code or create a new room." }); return; }
    const previous = currentRoomId();
    if (previous && previous !== id) {
      const old = rooms.getRoom(previous);
      const oldUser = old?.removeParticipant(socket.id);
      socket.leave(previous);
      if (old && oldUser) io.to(previous).emit("user_left", { username: oldUser.username, userId: socket.id, participants: old.getParticipantList() });
      rooms.deleteRoomIfEmpty(previous);
    }
    // The creator is already in the room after create_room. Preserve their Host role
    // when the Room page mounts and emits join_room for its initial state.
    const existing = room.getParticipant(socket.id);
    const participant = existing ?? room.addParticipant(socket.id, username, room.host ? "Participant" : "Host");
    socket.data.username = participant.username;
    socket.join(id);
    socket.emit("room_joined", { roomId: id, userId: socket.id, role: participant.role, participants: room.getParticipantList(), state: room.state });
    if (!existing) socket.to(id).emit("user_joined", { username: participant.username, userId: socket.id, role: participant.role, participants: room.getParticipantList() });
    callback?.({ ok: true });
  });

  socket.on("leave_room", ({ roomId }) => {
    const room = roomFor(roomId);
    if (!room) return;
    const participant = room.removeParticipant(socket.id);
    socket.leave(room.id);
    if (participant) io.to(room.id).emit("user_left", { username: participant.username, userId: socket.id, participants: room.getParticipantList() });
    rooms.deleteRoomIfEmpty(room.id);
  });

  socket.on("play", ({ roomId, currentTime }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.canControl(socket.id)) { error("Only the host or a moderator can control playback."); return; }
    room.updateState({ playState: "playing", currentTime: validTime(currentTime, room.state.currentTime) });
    broadcastState(room.id, room);
  });
  socket.on("pause", ({ roomId, currentTime }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.canControl(socket.id)) { error("Only the host or a moderator can control playback."); return; }
    room.updateState({ playState: "paused", currentTime: validTime(currentTime, room.state.currentTime) });
    broadcastState(room.id, room);
  });
  socket.on("seek", ({ roomId, time }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.canControl(socket.id)) { error("Only the host or a moderator can seek."); return; }
    if (!Number.isFinite(time) || time < 0 || time > 86400) return;
    room.updateState({ currentTime: time });
    broadcastState(room.id, room);
  });
  socket.on("change_video", ({ roomId, videoId }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.canControl(socket.id)) { error("Only the host or a moderator can change the video."); return; }
    if (typeof videoId !== "string" || !/^[\w-]{11}$/.test(videoId)) { error("Invalid YouTube video ID."); return; }
    room.updateState({ videoId, currentTime: 0, playState: "paused" });
    broadcastState(room.id, room);
  });

  socket.on("assign_role", ({ roomId, userId, role }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.isHost(socket.id)) { error("Only the host can assign roles."); return; }
    if (!VALID_ROLES.includes(role) || !rooms.assignRole(room, userId, role)) { error("That role change is not allowed."); return; }
    const participant = room.getParticipant(userId)!;
    io.to(room.id).emit("role_assigned", { userId, username: participant.username, role, participants: room.getParticipantList() });
  });
  socket.on("remove_participant", ({ roomId, userId }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.isHost(socket.id)) { error("Only the host can remove participants."); return; }
    if (userId === socket.id) { error("You cannot remove yourself. Leave the room instead."); return; }
    const participant = room.removeParticipant(userId);
    if (!participant) return;
    io.to(userId).emit("participant_removed", { userId, participants: room.getParticipantList() });
    io.to(room.id).emit("participant_removed", { userId, participants: room.getParticipantList() });
    io.sockets.sockets.get(userId)?.leave(room.id);
    rooms.deleteRoomIfEmpty(room.id);
  });
  socket.on("transfer_host", ({ roomId, userId }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.isHost(socket.id)) { error("Only the host can transfer host."); return; }
    if (!rooms.transferHost(room, userId)) { error("Could not transfer host to that participant."); return; }
    io.to(room.id).emit("host_transferred", { hostId: userId, participants: room.getParticipantList() });
    io.to(room.id).emit("role_assigned", { userId, username: room.getParticipant(userId)!.username, role: "Host", participants: room.getParticipantList() });
  });

  socket.on("send_chat", ({ roomId, message }) => {
    const room = roomFor(roomId); if (!room) return;
    if (typeof message !== "string" || !message.trim()) return;
    io.to(room.id).emit("chat_message", { id: randomUUID(), userId: socket.id, username: room.getParticipant(socket.id)?.username ?? "Guest", message: message.trim().slice(0, 500), timestamp: Date.now() });
  });

  socket.on("request_playback", ({ roomId, action, details }) => {
    const room = roomFor(roomId); if (!room) return;
    if (room.canControl(socket.id)) { error("You already have playback control."); return; }
    if (!["play", "pause", "seek", "change_video"].includes(action)) return;
    const host = room.host;
    if (!host) { error("There is no host available to approve requests."); return; }
    const requestId = randomUUID();
    const username = room.getParticipant(socket.id)?.username ?? "Participant";
    room.pendingRequests.set(requestId, { userId: socket.id, username, action, details });
    io.to(host.userId).emit("playback_request", { requestId, username, action, details });
    socket.emit("request_resolved", { requestId, approved: false, message: "Your request was sent to the host for approval." });
  });
  socket.on("resolve_request", ({ roomId, requestId, approved }) => {
    const room = roomFor(roomId); if (!room) return;
    if (!room.isHost(socket.id)) { error("Only the host can approve requests."); return; }
    const request = room.pendingRequests.get(requestId);
    if (!request) return;
    room.pendingRequests.delete(requestId);
    if (approved) {
      const details = request.details ?? {};
      if (request.action === "play") room.updateState({ playState: "playing" });
      else if (request.action === "pause") room.updateState({ playState: "paused" });
      else if (request.action === "seek" && typeof details.time === "number" && Number.isFinite(details.time) && details.time >= 0) room.updateState({ currentTime: details.time });
      else if (request.action === "change_video" && typeof details.videoId === "string" && /^[\w-]{11}$/.test(details.videoId)) room.updateState({ videoId: details.videoId, currentTime: 0, playState: "paused" });
      broadcastState(room.id, room);
    }
    io.to(request.userId).emit("request_resolved", { requestId, approved, message: approved ? "The host approved your request." : "The host declined your request." });
  });

  socket.on("disconnecting", () => {
    const roomId = currentRoomId();
    if (!roomId) return;
    const room = rooms.getRoom(roomId);
    if (!room) return;
    const participant = room.removeParticipant(socket.id);
    if (participant) io.to(roomId).emit("user_left", { username: participant.username, userId: socket.id, participants: room.getParticipantList() });
    rooms.deleteRoomIfEmpty(roomId);
  });
}

function validTime(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 86400 ? value : fallback;
}
