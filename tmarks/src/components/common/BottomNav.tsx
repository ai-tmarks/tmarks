import { Link, useLocation } from 'react-router-dom'
import { Layers, CheckSquare, BarChart3, Trash2 } from 'lucide-react'

interface NavItem {
  path: string
  icon: React.ReactNode
  label: string
}

const navItems: NavItem[] = [
  {
    path: '/tab',
    icon: <Layers className="w-5 h-5" />,
    label: '全部',
  },
  {
    path: '/tab/todo',
    icon: <CheckSquare className="w-5 h-5" />,
    label: '待办',
  },
  {
    path: '/tab/statistics',
    icon: <BarChart3 className="w-5 h-5" />,
    label: '统计',
  },
  {
    path: '/tab/trash',
    icon: <Trash2 className="w-5 h-5" />,
    label: '回收站',
  },
]

/**
 * 移动端底部导航栏
 */
export function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border z-30 safe-area-bottom md:hidden"
      style={{ backgroundColor: 'var(--card)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

