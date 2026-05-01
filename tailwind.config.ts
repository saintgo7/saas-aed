import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A"
        },
        success: {
          500: "#10B981",
          600: "#059669"
        },
        warning: {
          500: "#F59E0B",
          600: "#D97706"
        },
        danger: {
          500: "#EF4444",
          600: "#DC2626"
        }
      },
      fontFamily: {
        sans: ["Pretendard", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)"
      },
      minHeight: {
        "touch": "44px"
      },
      minWidth: {
        "touch": "44px"
      }
    }
  },
  plugins: []
}

export default config
