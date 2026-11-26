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

/** The GitHub mark, which is a filled shape rather than an outline like the icons above. */
export function GitHubIcon({ label }: { label?: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 007.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.39-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

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
