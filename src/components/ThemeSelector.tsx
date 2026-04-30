import { useGameStore } from "@/store/gameStore";

const THEMES = [
  { id: 'default', name: 'الأساسي', icon: '✨' },
  { id: 'pharaonic', name: 'فرعوني', icon: '𓂀' }, // 👈 الجديد
  { id: 'ramadan', name: 'رمضان', icon: '🏮' },
  { id: 'eid', name: 'العيد', icon: '🎉' },
  { id: 'worldcup', name: 'كأس العالم', icon: '⚽' },
  { id: 'neon', name: 'نيون', icon: '🌃' },
  { id: 'winter', name: 'شتوي', icon: '❄️' },
];

export function ThemeSelector() {
  const theme = useGameStore(s => s.theme);
  const setTheme = useGameStore(s => s.setTheme);

  return (
    <select 
      value={theme}
      onChange={e => setTheme(e.target.value as any)}
      className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-sm text-white backdrop-blur-xl hover:bg-white/10 transition"
    >
      {THEMES.map(t => (
        <option key={t.id} value={t.id} className="bg-gray-900">
          {t.icon} {t.name}
        </option>
      ))}
    </select>
  );
}