import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RoomHeader from "../components/RoomHeader";
import VideoPlayer from "../components/VideoPlayer";
import Controls from "../components/Controls";
import Participants from "../components/Participants";
import Chat from "../components/Chat";
import { socket } from "../services/socket";
import type { ChatMessage, Participant, PlaybackState, Role } from "../types";

const DEFAULT_VIDEO = "dQw4w9WgXcQ";
const initialState: PlaybackState = { videoId: DEFAULT_VIDEO, playState: "paused", currentTime: 0, updatedAt: Date.now() };

export default function Room() {
  const { roomId: rawRoomId } = useParams();
  const roomId = (rawRoomId || "").toUpperCase();
  const navigate = useNavigate();
  const [username] = useState(() => sessionStorage.getItem(`wp-name-${roomId}`) || "");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<Role>("Participant");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [state, setState] = useState<PlaybackState>(initialState);
  const [syncVersion, setSyncVersion] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requests, setRequests] = useState<{ requestId: string; username: string; action: string; details?: Record<string, unknown> }[]>([]);
  const [connected, setConnected] = useState(socket.connected);
  const joined = useRef(false);
  const canControl = role === "Host" || role === "Moderator";

  useEffect(() => {
    if (!username) { navigate("/"); return; }
    const join = () => {
      socket.emit("join_room", { roomId, username }, result => {
        if (result && !result.ok) { alert(result.error || "Could not join room."); navigate("/"); }
      });
    };
    const onConnect = () => { setConnected(true); if (!joined.current) join(); };
    const onDisconnect = () => setConnected(false);
    const onJoined = (data: { roomId: string; userId: string; role: Role; participants: Participant[]; state: PlaybackState }) => {
      if (data.roomId !== roomId) return;
      joined.current = true; setUserId(data.userId); setRole(data.role); setParticipants(data.participants); setState(data.state); setSyncVersion(v => v + 1);
    };
    const onState = (next: PlaybackState) => { setState(next); setSyncVersion(v => v + 1); };
    const onUserJoined = (data: { participants: Participant[] }) => setParticipants(data.participants);
    const onUserLeft = (data: { participants: Participant[] }) => setParticipants(data.participants);
    const onRole = (data: { userId: string; role: Role; participants: Participant[] }) => { setParticipants(data.participants); if (data.userId === socket.id) setRole(data.role); };
    const onRemoved = (data: { userId: string; participants: Participant[] }) => { setParticipants(data.participants); if (data.userId === socket.id) { alert("You were removed from this room."); navigate("/"); } };
    const onChat = (message: ChatMessage) => setMessages(old => [...old.slice(-99), message]);
    const onRequest = (request: { requestId: string; username: string; action: string; details?: Record<string, unknown> }) => setRequests(old => [...old, request]);
    const onResolved = (data: { requestId: string; approved: boolean; message: string }) => { setRequests(old => old.filter(r => r.requestId !== data.requestId)); alert(data.message); };
    const onHostTransferred = (data: { participants: Participant[] }) => { setParticipants(data.participants); const me = data.participants.find(p => p.userId === socket.id); if (me) setRole(me.role); };
    socket.on("connect", onConnect); socket.on("disconnect", onDisconnect); socket.on("room_joined", onJoined); socket.on("sync_state", onState);
    socket.on("user_joined", onUserJoined); socket.on("user_left", onUserLeft); socket.on("role_assigned", onRole); socket.on("participant_removed", onRemoved);
    socket.on("chat_message", onChat); socket.on("playback_request", onRequest); socket.on("request_resolved", onResolved); socket.on("host_transferred", onHostTransferred);
    if (socket.connected) join();
    return () => {
      socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off("room_joined", onJoined); socket.off("sync_state", onState);
      socket.off("user_joined", onUserJoined); socket.off("user_left", onUserLeft); socket.off("role_assigned", onRole); socket.off("participant_removed", onRemoved);
      socket.off("chat_message", onChat); socket.off("playback_request", onRequest); socket.off("request_resolved", onResolved); socket.off("host_transferred", onHostTransferred);
      if (joined.current) socket.emit("leave_room", { roomId });
      joined.current = false;
    };
  }, [roomId, username, navigate]);

  const play = useCallback((time?: number) => socket.emit("play", { roomId, currentTime: time ?? state.currentTime }), [roomId, state.currentTime]);
  const pause = useCallback((time?: number) => socket.emit("pause", { roomId, currentTime: time ?? state.currentTime }), [roomId, state.currentTime]);
  const seek = (time: number) => socket.emit("seek", { roomId, time });
  const changeVideo = (videoId: string) => socket.emit("change_video", { roomId, videoId });
  const leave = () => { socket.emit("leave_room", { roomId }); joined.current = false; navigate("/"); };
  const resolveRequest = (requestId: string, approved: boolean) => socket.emit("resolve_request", { roomId, requestId, approved });

  return <div className="room-page"><RoomHeader roomId={roomId} username={username} role={role} onLeave={leave}/>
    <main className="room-layout"><section className="watch-column"><div className="room-title-row"><div><p className="eyebrow">WATCH ROOM</p><h1>It's better together.</h1></div><span className={`connection ${connected ? "online" : ""}`}><i/> {connected ? "Connected" : "Reconnecting…"}</span></div>
      <VideoPlayer videoId={state.videoId} playState={state.playState} currentTime={state.currentTime} syncVersion={syncVersion} canControl={canControl}
        onReady={() => {}} onLocalState={(action, time) => action === "play" ? play(time) : action === "pause" ? pause(time) : seek(time)}/>
      <div className="video-caption"><div><strong>Now watching</strong><span>Video ID: {state.videoId}</span></div><span className={`play-state ${state.playState}`}>{state.playState === "playing" ? "▶ Playing" : "Ⅱ Paused"}</span></div>
      <Controls canControl={canControl} playState={state.playState} currentTime={state.currentTime} onPlay={() => play()} onPause={() => pause()} onSeek={seek} onChangeVideo={changeVideo}
        onRequest={(action, details) => socket.emit("request_playback", { roomId, action, details })}/>
      {role === "Host" && requests.length > 0 && <section className="side-card requests"><h2>Playback requests</h2>{requests.map(r => <div className="request-row" key={r.requestId}><span><strong>{r.username}</strong> requested {r.action}</span><div><button onClick={() => resolveRequest(r.requestId, true)}>Approve</button><button className="secondary" onClick={() => resolveRequest(r.requestId, false)}>Decline</button></div></div>)}</section>}
    </section><aside className="sidebar"><Participants participants={participants} currentUserId={userId} myRole={role}
      onAssign={(target, newRole) => socket.emit("assign_role", { roomId, userId: target, role: newRole })}
      onRemove={target => { if (confirm("Remove this participant?")) socket.emit("remove_participant", { roomId, userId: target }); }}
      onTransfer={target => { if (confirm("Transfer host role to this participant?")) socket.emit("transfer_host", { roomId, userId: target }); }}/>
      <Chat messages={messages} onSend={message => socket.emit("send_chat", { roomId, message })}/></aside></main>
  </div>;
}
