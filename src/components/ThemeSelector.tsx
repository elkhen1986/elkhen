import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const THEMES = [
  {
    id: 'default',
    name: 'الأساسي',
    icon: '✨',
    preview: 'from-[#10b981] to-[#059669]',
    desc: 'أخضر عصري'
  },
  {
    id: 'pharaonic',
    name: 'فرعوني',
    icon: '𓂀',
    preview: 'from-[#d4af37] to-[#8b6914]',
    desc: 'ذهب وأزرق لازورد'
  },
  {
    id: 'ramadan',
    name: 'رمضان',
    icon: '🏮',
    preview: 'from-[#d4af37] to-[#b8860b]',
    desc: 'فوانيس ذهبية'
  },
  {
    id: 'eid',
    name: 'العيد',
    icon: '🎉',
    preview: 'from-[#ff4ecd] to-[#a855f7]',
    desc: 'احتفالي'
  },
  {
    id: 'worldcup',
    name: 'كأس العالم',
    icon: '⚽',
    preview: 'from-[#ffffff] to-[#22c55e]',
    desc: 'ملعب أخضر'
  },
  {
    id: 'neon',
    name: 'نيون',
    icon: '🌃',
    preview: 'from-[#00ffff] to-[#ff00ff]',
    desc: 'سيبر بانك'
  },
  {
    id: 'winter',
    name: 'شتوي',
    icon: '❄️',
    preview: 'from-[#7dd3fc] to-[#0ea5e9]',
    desc: 'ثلج'
  },
];

export function ThemeSelector() {
  const theme = useGameStore(s => s.theme);
  const setTheme = useGameStore(s => s.setTheme);

  // طبق الثيم على الـ html
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('elkhen-theme', theme);
  }, [theme]);

  // حمّل الثيم المحفوظ
  useEffect(() => {
    const saved = localStorage.getItem('elkhen-theme');
    if (saved) setTheme(saved as any);
  }, [setTheme]);

  const current = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 px-2.5 bg-white/5 border border-white/10 hover:bg-white/10"
        >
          <span className="text-base leading-none">{current.icon}</span>
          <span className="hidden sm:inline text-xs">{current.name}</span>
          <Palette className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-2 glass-strong border-white/15"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-1">
          <div className="px-2 pb-1.5">
            <h4 className="text-xs font-bold text-muted-foreground">اختر الثيم</h4>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-right",
                  "hover:bg-white/10",
                  theme === t.id && "bg-white/15 ring-1 ring-primary/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0",
                  "bg-gradient-to-br", t.preview,
                  "shadow-lg"
                )}>
                  {t.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{t.name}</span>
                    {theme === t.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text- text-muted-foreground">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}