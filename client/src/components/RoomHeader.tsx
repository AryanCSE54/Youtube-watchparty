interface Props {
  roomId: string;
  username: string;
  role: string;
  onLeave: () => void;
}

export default function RoomHeader({ roomId, username, role, onLeave }: Props) {
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
      alert("Invite link copied!");
    } catch {
      window.prompt("Copy this invite link:", `${window.location.origin}/room/${roomId}`);
    }
  };

  return <header className="room-header">
    <a className="brand" href="/">▶ WatchParty</a>
    <div className="room-meta"><span>Room <strong>{roomId}</strong></span><span className={`role role-${role.toLowerCase()}`}>{role}</span></div>
    <div className="header-actions"><span className="signed-in">Hi, {username}</span><button className="secondary" onClick={copyInvite}>Copy invite link</button><button className="danger" onClick={onLeave}>Leave</button></div>
  </header>;
}
