export type Role = "Host" | "Moderator" | "Participant" | "Viewer";
export interface Participant { userId: string; username: string; role: Role; }
export interface PlaybackState { videoId: string; playState: "playing" | "paused"; currentTime: number; updatedAt: number; }

export class Room {
  readonly id: string;
  readonly participants = new Map<string, Participant>();
  readonly pendingRequests = new Map<string, { userId: string; username: string; action: string; details?: Record<string, unknown> }>();
  state: PlaybackState = { videoId: "dQw4w9WgXcQ", playState: "paused", currentTime: 0, updatedAt: Date.now() };

  constructor(id: string) { this.id = id; }
  addParticipant(userId: string, username: string, role: Role = "Participant"): Participant {
    const participant = { userId, username: username.trim().slice(0, 30), role };
    this.participants.set(userId, participant);
    return participant;
  }
  removeParticipant(userId: string): Participant | undefined {
    const participant = this.participants.get(userId);
    this.participants.delete(userId);
    return participant;
  }
  getParticipant(userId: string): Participant | undefined { return this.participants.get(userId); }
  get host(): Participant | undefined { return [...this.participants.values()].find(p => p.role === "Host"); }
  getParticipantList(): Participant[] { return [...this.participants.values()]; }
  canControl(userId: string): boolean {
    const role = this.getParticipant(userId)?.role;
    return role === "Host" || role === "Moderator";
  }
  isHost(userId: string): boolean { return this.getParticipant(userId)?.role === "Host"; }
  updateState(patch: Partial<PlaybackState>): PlaybackState {
    this.state = { ...this.state, ...patch, updatedAt: Date.now() };
    return this.state;
  }
}
