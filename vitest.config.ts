import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "build", ".plasmo"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "build/", ".plasmo/", "src/test/"]
    },
    // 浏览器扩展测试配置
    deps: {
      inline: [/@testing-library\/react/, /@testing-library\/jest-dom/]
    }
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./src")
    }
  },
  // 模拟 Chrome API
  define: {
    "process.env.NODE_ENV": '"test"'
  }
})
