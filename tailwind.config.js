/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 背景色
        background: {
          primary: 'rgba(250,247,247,0.98)',  // 主背景色
        },
        // 主色调 - 蓝色系，用于主要按钮、链接、选中状态
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',  // 主色
          600: '#2563eb',  // 深色，用于悬停状态
          700: '#1d4ed8',
        },
        // 次要色 - 紫色系，保留用于未来扩展
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
        },
        // 成功色 - 绿色系，用于保存按钮、成功状态、开关
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        // 危险色/错误色 - 红色系，用于删除按钮、错误状态
        danger: {
          50: '#fef2f2',
          600: '#dc2626',
          700: '#b91c1c',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        },
        // 警告色 - 黄色系
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
        },
        // 信息色 - 蓝色系
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
        },
        // OpenAI 品牌色 - 绿色系
        openai: {
          light: '#dcfce7',
          DEFAULT: '#16a34a',
          dark: '#166534',
        },
        // Claude 品牌色 - 紫色系
        claude: {
          light: '#f3e8ff',
          DEFAULT: '#9333ea',
          dark: '#6b21a8',
        },
        // Ollama 品牌色 - 蓝色系
        ollama: {
          light: '#dbeafe',
          DEFAULT: '#3b82f6',
          dark: '#1e40af',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif'
        ],
      },
    },
  },
  plugins: [],
}
