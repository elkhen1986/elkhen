export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  image: string;
  color: string;
}

export interface CategoryGroup {
  title: string;
  color: string; // 👈 لون المجموعة الأساسي
  categories: Category[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: "إسلاميات",
    color: "from-emerald-600 to-teal-600",
    categories: [
      { id: "quran", name: "قرآن كريم", image: "quran.jpg", color: "from-emerald-900 to-teal-900" },
      { id: "hadith", name: "أحاديث", image: "hadith.jpg", color: "from-emerald-800 to-teal-800" },
      { id: "seera", name: "سيرة نبوية", image: "seera.jpg", color: "from-emerald-700 to-teal-700" },
      { id: "sahaba", name: "صحابة", image: "sahaba.jpg", color: "from-emerald-600 to-teal-600" },
      { id: "fiqh", name: "فقه", image: "fiqh.jpg", color: "from-emerald-500 to-teal-500" },
      { id: "prophets", name: "أنبياء", image: "prophets.jpg", color: "from-emerald-400 to-teal-400" },
    ],
  },
  {
    title: "منوعات",
    color: "from-blue-600 to-indigo-600",
    categories: [
      { id: "general", name: "معلومات عامة", image: "general.jpg", color: "from-blue-900 to-indigo-900" },
      { id: "animals", name: "حيوانات", image: "animals.jpg", color: "from-blue-800 to-indigo-800" },
      { id: "food", name: "أكل", image: "food.jpg", color: "from-blue-700 to-indigo-700" },
      { id: "cars", name: "سيارات", image: "cars.jpg", color: "from-blue-600 to-indigo-600" },
      { id: "health", name: "صحة", image: "health.jpg", color: "from-blue-500 to-indigo-500" },
      { id: "brands", name: "ماركات عالمية", image: "brands.png", color: "from-blue-400 to-indigo-400" },
    ],
  },
  {
    title: "جغرافيا وتاريخ",
    color: "from-amber-600 to-orange-600",
    categories: [
      { id: "flags", name: "أعلام الدول", image: "flags.jpg", color: "from-amber-900 to-orange-900" },
      { id: "maps", name: "خرائط", image: "maps.jpg", color: "from-amber-800 to-orange-800" },
      { id: "capitals", name: "عواصم", image: "capitals.jpg", color: "from-amber-700 to-orange-700" },
      { id: "leadrs", name: "زعماء وقادة", image: "leadrs.avif", color: "from-amber-600 to-orange-600" },
      { id: "landmarks", name: "معالم", image: "landmarks.jpg", color: "from-amber-500 to-orange-500" },
      { id: "history", name: "تاريخ", image: "history.jpg", color: "from-amber-400 to-orange-400" },
    ],
  },
  {
    title: "مصريات",
    color: "from-violet-600 to-purple-600",
    categories: [
      { id: "egyptleadrs", name: "حكام", image: "egyptleadrs.png", color: "from-violet-900 to-purple-900" },
      { id: "governorates", name: "محافظات", image: "governorates.jpg", color: "from-violet-700 to-purple-700" },
    ],
  },
  {
    title: "علوم",
    color: "from-pink-600 to-rose-600",
    categories: [
      { id: "science", name: "علوم", image: "science.jpg", color: "from-pink-900 to-rose-900" },
      { id: "math", name: "رياضيات", image: "math.jpg", color: "from-pink-700 to-rose-700" },
      { id: "arabic", name: "لغة عربية", image: "arabic.jpg", color: "from-pink-500 to-rose-500" },
    ],
  },
  {
    title: "تكنولوجيا",
    color: "from-cyan-600 to-sky-600",
    categories: [
      { id: "mobile", name: "موبايلات", image: "mobile.jpg", color: "from-cyan-900 to-sky-900" },
      { id: "ai", name: "Ai", image: "ai.jpg", color: "from-cyan-700 to-sky-700" },
      { id: "apps", name: "تطبيقات", image: "apps.jpg", color: "from-cyan-500 to-sky-500" },
    ],
  },
  {
    title: "ألعاب",
    color: "from-red-600 to-rose-600",
    categories: [
      { id: "roblox", name: "روبلوكس", image: "roblox.jpg", color: "from-red-900 to-rose-900" },
      { id: "fortnite", name: "فورتنايت", image: "fortnite.jpg", color: "from-red-800 to-rose-800" },
      { id: "pubg", name: "ببجي", image: "pubg.jpg", color: "from-red-600 to-rose-600" },
      { id: "minecraft", name: "ماينكرافت", image: "minecraft.png", color: "from-red-400 to-rose-400" },
    ],
  },
  {
    title: "أنمي",
    color: "from-orange-600 to-orange-500",
    categories: [
      { id: "demonslayer", name: "قاتل الشياطين", image: "demonslayer.jpg", color: "from-orange-900 to-orange-800" },
      { id: "sololeveling", name: "سولو ليفلينج", image: "sololeveling.jpg", color: "from-orange-800 to-orange-700" },
      { id: "onepiece", name: "ون بيس", image: "onepiece.jpg", color: "from-orange-700 to-orange-600" },
      { id: "naruto", name: "ناروتو", image: "naruto.jpg", color: "from-orange-600 to-orange-500" },
      { id: "dragonball", name: "دراغون بول", image: "dragonball.jpg", color: "from-orange-500 to-orange-400" },
      { id: "brainrot", name: "براين روت", image: "brainrot.jpg", color: "from-orange-400 to-orange-300" },
    ],
  },
  {
    title: "ألغاز وذكاء",
    color: "from-fuchsia-600 to-fuchsia-500",
    categories: [
      { id: "riddles", name: "ألغاز", image: "riddles.jpg", color: "from-fuchsia-900 to-fuchsia-800" },
      { id: "iq", name: "اختبار ذكاء", image: "iq.jpg", color: "from-fuchsia-800 to-fuchsia-700" },
      { id: "observation", name: "قوة ملاحظة", image: "observation.jpg", color: "from-fuchsia-700 to-fuchsia-600" },
      { id: "differences", name: "أوجد الاختلاف", image: "differences.jpg", color: "from-fuchsia-600 to-fuchsia-500" },
    ],
  },
  {
    title: "دراما",
    color: "from-slate-300 to-gray-400",
    categories: [
      { id: "egyptianmovies", name: "أفلام مصرية", image: "egyptianmovies.jpg", color: "from-slate-900 to-gray-900" },
      { id: "egyptianseries", name: "مسلسلات مصرية", image: "egyptianseries.jpg", color: "from-slate-800 to-gray-800" },
      { id: "egyptiansongs", name: "أغاني مصرية", image: "egyptiansongs.png", color: "from-slate-700 to-gray-700" },
      { id: "worldmovies", name: "أفلام عالمية", image: "worldmovies.jpg", color: "from-slate-600 to-gray-600" },
    ],
  },
  {
    title: "كرة قدم",
    color: "from-lime-600 to-green-600",
    categories: [
      { id: "football", name: "كرة قدم", image: "football.jpg", color: "from-lime-900 to-green-900" },
      { id: "worldcup", name: "كأس العالم", image: "worldcup.jpg", color: "from-lime-800 to-green-800" },
      { id: "ucl", name: "دوري الأبطال", image: "ucl.jpg", color: "from-lime-700 to-green-700" },
      { id: "epl", name: "الدوري الإنجليزي", image: "epl.jpg", color: "from-lime-600 to-green-600" },
      { id: "laliga", name: "الدوري الإسباني", image: "laliga.jpg", color: "from-lime-500 to-green-500" },
      { id: "egypt", name: "الدوري المصري", image: "egypt.jpg", color: "from-lime-400 to-green-400" },
    ],
  },
];

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.categories);
export const getCategory = (id: CategoryId) => ALL_CATEGORIES.find(c => c.id === id);