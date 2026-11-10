// Small stroke icons, drawn at 24px and scaled with `size`.
const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

export const ArrowRight = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const ArrowLeft = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);
export const Plus = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Close = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Bell = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0" />
  </svg>
);
export const Search = ({ size = 16 }) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);
export const Calendar = ({ size = 16 }) => (
  <svg {...base(size)}>
    <rect x="4" y="5.5" width="16" height="14" rx="3" />
    <path d="M4 10h16M9 3.5v4M15 3.5v4" />
  </svg>
);
export const Heart = ({ size = 16, filled }) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 19s-7-4.4-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 2.5C19 14.6 12 19 12 19z" />
  </svg>
);
export const Chat = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H7.5A2.5 2.5 0 0 1 5 13.5z" />
  </svg>
);
export const Flag = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M6 20V5M6 5h10l-2 4 2 4H6" />
  </svg>
);
export const Ban = ({ size = 16 }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="7.5" />
    <path d="M6.8 6.8l10.4 10.4" />
  </svg>
);
export const LogOut = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M14 5h3.5A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14M10 16l4-4-4-4M14 12H4" />
  </svg>
);
export const Swap = ({ size = 16 }) => (
  <svg {...base(size)}>
    <path d="M7 7h11l-3-3M17 17H6l3 3" />
  </svg>
);
export const Star = ({ size = 14, filled = true }) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.4}>
    <path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" />
  </svg>
);
export const Menu = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M5 8h14M5 16h14" />
  </svg>
);
export const Shield = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 3.5l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9v-5z" />
  </svg>
);

// Black pill with a white circle holding an icon, the signature button of the brand.
export function CircleIcon({ children, tone = 'light' }) {
  return <span className={`circle-ic ${tone}`}>{children}</span>;
}
