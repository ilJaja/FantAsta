import { metadataFor, unavailableFor } from "@/lib/ramera";

export function PlayerRow({ name, price }: { name: string; price: number }) {
  const meta = metadataFor(name);
  const unavailable = unavailableFor(name);
  return <div className="player-row">
    <div className="player-avatar">{name.slice(0, 2).toUpperCase()}</div>
    <div className="player-copy"><strong>{name}</strong><span>{meta.club} · {meta.role}</span></div>
    {unavailable ? <span className="status danger" title={unavailable}>OUT</span> : <span className="status ok">OK</span>}
    <strong className="price">{price} cr</strong>
  </div>;
}
