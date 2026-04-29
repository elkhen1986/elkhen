import {
  BookOpen, Moon, Users, Globe, Map, Flag, Coins, Crown,
  Landmark, Building2, Film, Tv, Music, Eye, Brain, Search, Calculator, Diff,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CategoryId =
  | "quran" | "seera" | "sahaba"
  | "general"
  | "countries" | "maps" | "flags" | "currencies" | "leaders"
  | "egypt_history" | "governorates"
  | "movies" | "series" | "songs"
  | "guess_eye" | "riddles" | "observation" | "math_riddles" | "differences";

export interface Category {
  id: CategoryId;
  name: string;
  icon: LucideIcon;
  color: string; // tailwind gradient stops
}

export interface CategoryGroup {
  title: string;
  categories: Category[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: "فئات إسلامية",
    categories: [
      { id: "quran", name: "قرآن كريم", icon: BookOpen, color: "from-emerald-500 to-teal-600" },
      { id: "seera", name: "السيرة النبوية", icon: Moon, color: "from-emerald-600 to-green-700" },
      { id: "sahaba", name: "صحابة الرسول", icon: Users, color: "from-teal-500 to-emerald-700" },
    ],
  },
  {
    title: "فئات عامة",
    categories: [
      { id: "general", name: "معلومات عامة", icon: Lightbulb, color: "from-blue-500 to-indigo-600" },
    ],
  },
  {
    title: "تاريخ وجغرافيا",
    categories: [
      { id: "countries", name: "دول وعواصم", icon: Globe, color: "from-sky-500 to-blue-600" },
      { id: "maps", name: "خرائط", icon: Map, color: "from-cyan-500 to-sky-600" },
      { id: "flags", name: "أعلام الدول", icon: Flag, color: "from-rose-500 to-red-600" },
      { id: "currencies", name: "عملات", icon: Coins, color: "from-amber-500 to-yellow-600" },
      { id: "leaders", name: "زعماء ورؤساء", icon: Crown, color: "from-purple-500 to-violet-600" },
    ],
  },
  {
    title: "مصريات",
    categories: [
      { id: "egypt_history", name: "تاريخ مصر", icon: Landmark, color: "from-yellow-600 to-amber-700" },
      { id: "governorates", name: "محافظات", icon: Building2, color: "from-orange-500 to-amber-600" },
    ],
  },
  {
    title: "الفن والفنانين",
    categories: [
      { id: "movies", name: "أفلام", icon: Film, color: "from-pink-500 to-rose-600" },
      { id: "series", name: "مسلسلات", icon: Tv, color: "from-fuchsia-500 to-pink-600" },
      { id: "songs", name: "أغاني", icon: Music, color: "from-purple-500 to-fuchsia-600" },
    ],
  },
  {
    title: "العبها صح",
    categories: [
      { id: "guess_eye", name: "من عينه", icon: Eye, color: "from-indigo-500 to-blue-600" },
      { id: "riddles", name: "ألغاز", icon: Brain, color: "from-violet-500 to-purple-600" },
      { id: "observation", name: "قوة الملاحظة", icon: Search, color: "from-cyan-500 to-teal-600" },
      { id: "math_riddles", name: "ألغاز رياضية", icon: Calculator, color: "from-blue-600 to-indigo-700" },
      { id: "differences", name: "أوجد الاختلافات", icon: Diff, color: "from-teal-500 to-cyan-600" },
    ],
  },
];

export const ALL_CATEGORIES: Category[] = CATEGORY_GROUPS.flatMap((g) => g.categories);

export function getCategory(id: CategoryId): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}
