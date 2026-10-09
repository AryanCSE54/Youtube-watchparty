import type { Participant, Role } from "../types";

interface Props {
  participants: Participant[];
  currentUserId: string;
  myRole: Role;
  onAssign: (userId: string, role: Role) => void;
  onRemove: (userId: string) => void;
  onTransfer: (userId: string) => void;
}

export default function Participants({ participants, currentUserId, myRole, onAssign, onRemove, onTransfer }: Props) {
  const isHost = myRole === "Host";
  return <section className="side-card"><div className="section-heading"><h2>People here</h2><span className="count">{participants.length}</span></div>
    <div className="participant-list">{participants.map(p => <div className="participant" key={p.userId}>
      <div className="avatar">{p.username.slice(0, 1).toUpperCase()}</div><div className="participant-info"><strong>{p.username}{p.userId === currentUserId ? " (you)" : ""}</strong><span className={`role role-${p.role.toLowerCase()}`}>{p.role}</span></div>
      {isHost && p.userId !== currentUserId && <details className="participant-menu"><summary aria-label={`Actions for ${p.username}`}>•••</summary><div className="menu-options">
        <button onClick={() => onAssign(p.userId, p.role === "Moderator" ? "Participant" : "Moderator")}>{p.role === "Moderator" ? "Remove moderator" : "Make moderator"}</button>
        <button onClick={() => onTransfer(p.userId)}>Transfer host</button><button className="danger-text" onClick={() => onRemove(p.userId)}>Remove</button>
      </div></details>}
    </div>)}</div>
  </section>;
}
