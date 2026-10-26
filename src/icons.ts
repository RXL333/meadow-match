const paths: Record<string, string> = {
  leaf: '<path d="M19 4C9 3 3 8 6 15s13 3 13-11Z"/><path d="m4 20 10-11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  sound:
    '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1.5-1.5 2.5M12 17h.01"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  back: '<path d="M9 5 2 12l7 7M2 12h12a6 6 0 0 1 6 6"/>',
  move: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M14 6h5v5m0-5-7 7M5 14v5h5"/>',
  shuffle:
    '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 5-5m2-3c2-3 3-4 5-4h3m-4-4 4 4-4 4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
  trophy:
    '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 0h8"/>',
  book: '<path d="M12 5C8 2 4 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-2-1-6-2-10 1Zm0 0v15"/>',
  flower:
    '<path d="M12 8c-5-9-11 1-5 4-8 3-1 11 4 5 3 8 11 1 5-4 9-2 2-11-4-5Z"/><circle cx="12" cy="12" r="2"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
};
export function icon(name: string, extra = ""): string {
  return `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.leaf}</svg>`;
}

export function sheep(extra = ""): string {
  return `<svg class="sheep ${extra}" viewBox="0 0 260 230" aria-hidden="true">
    <defs><radialGradient id="wool"><stop stop-color="#fffef3"/><stop offset=".75" stop-color="#f4eddb"/><stop offset="1" stop-color="#e1d8bb"/></radialGradient><linearGradient id="face" x2=".7" y2="1"><stop stop-color="#c9b598"/><stop offset="1" stop-color="#ac9576"/></linearGradient></defs>
    <ellipse cx="132" cy="208" rx="77" ry="11" fill="#71834c" opacity=".15"/>
    <g class="sheep-body"><path d="m83 171 1 27q5 12 15 1l7-30m51 0 5 29q7 11 16-1l-1-30" fill="#8e775b"/>
    <path d="M61 120C39 98 55 71 77 71c0-25 29-37 48-20 17-24 45-14 48 6 29-10 50 12 43 34 23 15 18 44-1 52 9 26-11 46-33 42-14 22-42 20-52 4-24 15-49 6-50-15-26 4-42-24-26-40Z" fill="url(#wool)"/>
    <g fill="#fffcef" opacity=".6"><ellipse cx="88" cy="90" rx="22" ry="19"/><ellipse cx="125" cy="74" rx="22" ry="17"/><ellipse cx="170" cy="81" rx="24" ry="18"/><ellipse cx="74" cy="132" rx="20" ry="23"/></g>
    <path d="M104 109c-32-13-43 4-19 20l21 1m56-21c32-13 43 4 19 20l-21 1" fill="#aa9373"/>
    <path d="M104 108c-5 10-8 33-3 52 8 30 52 31 63-2 5-17 2-39-4-50Z" fill="url(#face)"/>
    <path d="M102 111c-12-11-5-25 9-23 5-15 24-13 28-2 17-7 30 5 23 18 2 10-11 14-18 7-6 9-17 9-22 1-9 6-15 6-20-1" fill="url(#wool)"/>
    <g class="sheep-eyes" fill="#3e4937"><ellipse cx="116" cy="138" rx="3.4" ry="4.2"/><ellipse cx="149" cy="138" rx="3.4" ry="4.2"/></g>
    <ellipse cx="109" cy="150" rx="7" ry="3" fill="#d39c87" opacity=".55"/><ellipse cx="156" cy="150" rx="7" ry="3" fill="#d39c87" opacity=".55"/>
    <path d="m129 151 3 3 3-3m-3 3v4m-7-1q7 9 14 0" stroke="#786247" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    </g><path d="m197 61 8-13m-3 27 15-5" stroke="#f6d77f" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
