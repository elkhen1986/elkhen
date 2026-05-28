import { useNavigate } from 'react-router-dom'
import { Trophy, Gavel, Zap, Users, Crown, Flame, Swords, Layers } from 'lucide-react'

const modes = [
  {
    id: 'classic',
    title: 'مسابقة خُن',
    tag: 'الكلاسيك',
    desc: 'لو عرفتها .. خُنها.',
    icon: Trophy,
    color: 'from-violet-600 to-indigo-700',
    path: '/categories',
    active: true,
  },
  {
    id: 'auction',
    title: 'مزاد خُن',
    tag: 'المزاد',
    desc: 'لا مكان للجبناء.',
    icon: Gavel,
    color: 'from-amber-500 to-orange-600',
    path: '/auction',
    active: false,
  },
  {
    id: 'speed',
    title: 'أسئلة سرعة',
    tag: 'البرق',
    desc: ' خُن قبل ما الوقت يخونك.',
    icon: Zap,
    color: 'from-cyan-500 to-blue-600',
    path: '/speed',
    active: false,
  },
  
 
]

export default function GameHub() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">ساحة خُن</h1>
            <p className="text-gray-400 mt-1">اختار اللعبة وابدأ التحدي</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="font-bold">5,761</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modes.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                onClick={() => m.active && navigate(m.path)}
                disabled={!m.active}
                className={`group relative overflow-hidden rounded-2xl p- transition-all hover:scale-[1.02] ${!m.active ? 'opacity-60' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                <div className="relative bg-[#11151f]/90 backdrop-blur rounded-2xl p-6 h-full text-right">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${m.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs px-2 py-1 bg-white/10 rounded-lg">{m.tag}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1">{m.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 h-10">{m.desc}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-3">
                    </div>
                    <span className={`font-bold ${m.active ? 'text-white group-hover:translate-x-[-2px] transition-transform' : 'text-gray-500'}`}>
                      {m.active ? 'العب الآن ←' : 'قريباً'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}