const S = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {children}
  </svg>
)

export const Icon = {
  Dumbbell: () => <S><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></S>,
  Run: () => <S><circle cx="14" cy="4.5" r="1.8" /><path d="M8 21l3-6 3 2v5M6 12l3-4 4 1 3 3 3 1M11 15l-1-4" /></S>,
  Stretch: () => <S><circle cx="12" cy="4.5" r="1.8" /><path d="M4 9l8 1 8-1M12 10v5l-4 6M12 15l4 6" /></S>,
  Moon: () => <S><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></S>,
  Sun: () => <S><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>,
  Scale: () => <S><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 9a5 5 0 0 1 8 0l-3 3" /></S>,
  Home: () => <S><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></S>,
  Chart: () => <S><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-7" /></S>,
  List: () => <S><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></S>,
  Gear: () => <S><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>,
  Check: () => <S strokeWidth="3"><path d="M5 12l5 5L20 7" /></S>,
  Chevron: () => <S><path d="M9 6l6 6-6 6" /></S>,
  Up: () => <S strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></S>,
  Down: () => <S strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7" /></S>,
  Equal: () => <S strokeWidth="2.5"><path d="M5 9h14M5 15h14" /></S>,
  Spark: () => <S><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></S>,
  Bed: () => <S><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="2" /></S>,
  Plus: () => <S><path d="M12 5v14M5 12h14" /></S>,
  Trash: () => <S><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></S>,
  Shuffle: () => <S><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></S>,
  Swap: () => <S><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></S>,
  Food: () => <S><path d="M7 2v9a2 2 0 0 0 2 2v9M11 2v7a2 2 0 0 1-2 2M5 2v7a2 2 0 0 0 2 2M17 22V2c2.5 1.5 4 4 4 8h-4" /></S>,
  Flame: () => <S><path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-1.5 2-2 4-2 6 0 5 3 9 7 9z" /></S>,
  Calendar: () => <S><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></S>,
  Move: () => <S><path d="M5 12h14M13 6l6 6-6 6" /></S>,
  Clock: () => <S><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>,
  Route: () => <S><path d="M6 21L10 3M18 21L14 3M12 7v2M12 12v2M12 17v2" /></S>,
  Play: () => <S><path d="M7 5l12 7-12 7z" fill="currentColor" /></S>,
  Pause: () => <S><path d="M8 5v14M16 5v14" strokeWidth="3" /></S>,
  Metronome: () => <S><path d="M9 3h6l4 18H5zM12 17l5-9M8 14h8" /></S>,
  ChevronLeft: () => <S><path d="M15 6l-6 6 6 6" /></S>,
  X: () => <S><path d="M6 6l12 12M18 6L6 18" /></S>,
  Logo: () => (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="ctg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e8955f" /><stop offset="1" stopColor="#a8502a" /></linearGradient></defs>
      <rect width="64" height="64" rx="14" fill="#1b1416" />
      <path d="M18 46c4-14 12-24 28-28-6 6-9 12-10 18 3-4 7-6 11-6-7 4-11 10-13 18z" fill="url(#ctg)" />
    </svg>
  ),
}

export const kindIcon = (kind) => (kind === 'up' ? <Icon.Up /> : kind === 'down' ? <Icon.Down /> : kind === 'start' ? <Icon.Spark /> : <Icon.Equal />)
export const kindLabel = { up: 'Level up', hold: 'Repeat', down: 'Deload', start: 'New' }
