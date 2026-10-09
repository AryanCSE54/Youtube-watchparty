import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";

export default function Home() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const createRoom = () => {
    const name = username.trim();
    if (!name) { alert("Enter your name first."); return; }
    setBusy(true);
    socket.emit("create_room", { username: name }, result => {
      setBusy(false);
      if ("error" in result) { alert(result.error); return; }
      sessionStorage.setItem(`wp-name-${result.roomId}`, name);
      navigate(`/room/${result.roomId}`);
    });
  };
  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) { alert("Enter your name and room code."); return; }
    const id = roomId.trim().toUpperCase();
    sessionStorage.setItem(`wp-name-${id}`, username.trim());
    navigate(`/room/${id}`);
  };

  return <main className="home-page"><nav className="home-nav"><a className="brand" href="/">▶ WatchParty</a><span>Good videos are better together.</span></nav>
    <section className="hero"><div className="hero-copy"><span className="eyebrow">YOUR PEOPLE. YOUR VIDEOS.</span><h1>Watch together.<br/><span>Even miles apart.</span></h1><p>Create a private room, invite your friends, and enjoy YouTube videos in sync — wherever everyone is.</p>
      <div className="feature-pills"><span>✦ Synchronized playback</span><span>✦ Private rooms</span><span>✦ Live chat</span></div></div>
      <div className="join-card"><div className="card-icon">▶</div><h2>Start your watch party</h2><p>Pick a name, then create a room or join a friend.</p>
        <label htmlFor="username">Your display name</label><input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. Alex" maxLength={30}/>
        <button className="full-button" disabled={busy} onClick={createRoom}>{busy ? "Creating..." : "＋ Create a room"}</button>
        <div className="or-divider"><span>or join a room</span></div>
        <form onSubmit={joinRoom}><label htmlFor="room-code">Room code</label><div className="join-row"><input id="room-code" value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3" maxLength={8}/><button type="submit" className="secondary">Join</button></div></form>
        <small>By joining, you agree to be kind to everyone in the room.</small>
      </div></section>
    <footer className="home-footer">Made for movie nights, music sessions, and shared moments.</footer>
  </main>;
}
