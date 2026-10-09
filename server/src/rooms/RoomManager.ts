import { randomBytes } from "node:crypto";
import { Room, type Role } from "../models/Room.js";

export class RoomManager {
  private rooms = new Map<string, Room>();
  createRoom(): Room {
    let id = "";
    do { id = randomBytes(3).toString("hex").toUpperCase(); } while (this.rooms.has(id));
    const room = new Room(id);
    this.rooms.set(id, room);
    return room;
  }
  getRoom(roomId: string): Room | undefined { return this.rooms.get(roomId.toUpperCase()); }
  deleteRoomIfEmpty(roomId: string): void {
    const room = this.getRoom(roomId);
    if (room && room.participants.size === 0) this.rooms.delete(room.id);
  }
  assignRole(room: Room, userId: string, role: Role): boolean {
    const participant = room.getParticipant(userId);
    if (!participant || role === "Host") return false;
    participant.role = role;
    return true;
  }
  transferHost(room: Room, targetUserId: string): boolean {
    const target = room.getParticipant(targetUserId);
    const currentHost = room.host;
    if (!target || !currentHost) return false;
    currentHost.role = "Moderator";
    target.role = "Host";
    return true;
  }
  allRooms(): Room[] { return [...this.rooms.values()]; }
}
