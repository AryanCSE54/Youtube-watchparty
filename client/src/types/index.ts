export type Role = "Host" | "Moderator" | "Participant" | "Viewer";

export interface Participant {
  userId: string;
  username: string;
  role: Role;
}

export interface PlaybackState {
  videoId: string;
  playState: "playing" | "paused";
  currentTime: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface RoomSnapshot {
  roomId: string;
  participants: Participant[];
  state: PlaybackState;
}

export interface ServerToClientEvents {
  room_joined: (data: { roomId: string; userId: string; role: Role; participants: Participant[]; state: PlaybackState }) => void;
  user_joined: (data: { username: string; userId: string; role: Role; participants: Participant[] }) => void;
  user_left: (data: { username: string; userId: string; participants: Participant[] }) => void;
  sync_state: (state: PlaybackState) => void;
  role_assigned: (data: { userId: string; username: string; role: Role; participants: Participant[] }) => void;
  participant_removed: (data: { userId: string; participants: Participant[] }) => void;
  chat_message: (message: ChatMessage) => void;
  room_error: (data: { message: string }) => void;
  playback_request: (data: { requestId: string; username: string; action: string; details?: Record<string, unknown> }) => void;
  request_resolved: (data: { requestId: string; approved: boolean; message: string }) => void;
  host_transferred: (data: { hostId: string; participants: Participant[] }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { username: string }, callback: (result: { roomId: string } | { error: string }) => void) => void;
  join_room: (data: { roomId: string; username: string }, callback?: (result: { ok: boolean; error?: string }) => void) => void;
  leave_room: (data: { roomId: string }) => void;
  play: (data: { roomId: string; currentTime?: number }) => void;
  pause: (data: { roomId: string; currentTime?: number }) => void;
  seek: (data: { roomId: string; time: number }) => void;
  change_video: (data: { roomId: string; videoId: string }) => void;
  assign_role: (data: { roomId: string; userId: string; role: Role }) => void;
  remove_participant: (data: { roomId: string; userId: string }) => void;
  transfer_host: (data: { roomId: string; userId: string }) => void;
  send_chat: (data: { roomId: string; message: string }) => void;
  request_playback: (data: { roomId: string; action: string; details?: Record<string, unknown> }) => void;
  resolve_request: (data: { roomId: string; requestId: string; approved: boolean }) => void;
}
