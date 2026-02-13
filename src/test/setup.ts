import "@testing-library/jest-dom"

// Mock Chrome Extension API
global.chrome = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    id: "test-extension-id",
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    sendMessage: vi.fn(),
    getManifest: vi.fn(() => ({ manifest_version: 3 }))
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  scripting: {
    executeScript: vi.fn()
  }
} as unknown as typeof chrome

// Mock window.location using a Proxy approach
let currentHref = "https://chat.deepseek.com/"

const mockLocation = {
  get href() {
    return currentHref
  },
  set href(value: string) {
    currentHref = value
  },
  get host() {
    try {
      return new URL(currentHref).host
    } catch {
      return ""
    }
  },
  set host(value: string) {
    // Parse current href and replace host
    try {
      const url = new URL(currentHref)
      url.host = value
      currentHref = url.toString()
    } catch {
      currentHref = `https://${value}/`
    }
  },
  get hostname() {
    try {
      return new URL(currentHref).hostname
    } catch {
      return ""
    }
  },
  get protocol() {
    try {
      return new URL(currentHref).protocol
    } catch {
      return "https:"
    }
  },
  get pathname() {
    try {
      return new URL(currentHref).pathname
    } catch {
      return "/"
    }
  },
  get search() {
    try {
      return new URL(currentHref).search
    } catch {
      return ""
    }
  },
  get hash() {
    try {
      return new URL(currentHref).hash
    } catch {
      return ""
    }
  },
  toString: () => currentHref,
  reload: vi.fn(),
  replace: vi.fn(),
  assign: vi.fn()
}

// Replace window.location with our mock
Object.defineProperty(window, "location", {
  get: () => mockLocation,
  configurable: true
})

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "test-uuid-1234"
  }
})

// 清理 DOM 在每个测试后
afterEach(() => {
  document.body.innerHTML = ""
  vi.clearAllMocks()
})
