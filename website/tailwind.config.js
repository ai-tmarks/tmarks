/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // 基础颜色
        background: 'var(--background)',
        foreground: 'var(--foreground)',

        // 卡片
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',

        // 弹出层
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',

        // 主色调
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',

        // 次要色
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',

        // 静音色
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',

        // 强调色
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',

        // 成功色
        success: 'var(--success)',
        'success-foreground': 'var(--success-foreground)',

        // 错误/危险色
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        error: 'var(--destructive)',
        'error-content': 'var(--destructive-foreground)',

        // 警告色
        warning: 'var(--warning)',
        'warning-foreground': 'var(--warning-foreground)',
        'warning-content': 'var(--warning-foreground)',

        // 边框和输入框
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: `calc(var(--radius) + 4px)`,
        md: `calc(var(--radius) + 2px)`,
        sm: 'calc(var(--radius) - 2px)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradient 15s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        'fade-in-down': 'fadeInDown 0.8s ease-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'bounce-in': 'bounceIn 0.8s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 0, 0, 0.2)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

