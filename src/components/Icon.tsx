const paths = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  // Tabs
  advances: 'M6 3h9l3 3v15H6zM15 3v3h3M9 10h6M9 14h6M9 18h4',
  cities: 'M3 21h18M5 21V11l4-3 4 3v10M13 21V7l3-3 3 3v14M8 14h2M8 17h2M16 10h0M16 13h0M16 16h0',
  trade: 'M4 8h13l-3-3M20 16H7l3 3',
  calamities: 'M12 3l9.5 17h-19zM12 10v4M12 17.5v.01',
  specials: 'M12 3l2.2 5.4L20 9l-4.4 3.8L17 19l-5-3.1L7 19l1.4-6.2L4 9l5.8-.6z',
  flag: 'M5 21V4M5 4h12l-2.5 4.5L17 13H5',
  wallet: 'M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H4zM4 7V5.5A1.5 1.5 0 015.5 4H16M15 13.5h2',
  chevronDown: 'M5 9l7 7 7-7',
  up: 'M12 19V6M6 11l6-6 6 6',
  down: 'M12 5v13M6 13l6 6 6-6',
  info: 'M12 8v.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={paths[name]} />
    </svg>
  );
}
