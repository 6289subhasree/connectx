import { Star } from './Icons.jsx';
import { initials } from '../api';

const HUES = [210, 25, 160, 280, 340, 45, 190];

export default function Avatar({ user, size = 44 }) {
  if (!user) return null;
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (user.photo) return <img className="avatar" src={user.photo} alt={user.name} style={style} />;
  const hue = HUES[(user.name || '').length % HUES.length];
  return (
    <span className="avatar" style={{ ...style, background: `hsl(${hue} 45% 88%)`, color: `hsl(${hue} 50% 28%)` }} aria-hidden>
      {initials(user.name)}
    </span>
  );
}

export function Stars({ value = 0, count }) {
  return (
    <span className="stars" title={`${value} out of 5`}>
      <Star size={13} /> {Number(value).toFixed(1)}
      {count !== undefined && <span className="muted"> ({count})</span>}
    </span>
  );
}
