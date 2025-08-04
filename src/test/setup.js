// Test setup file for Vitest
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase Auth for tests
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    callback(null)
    return () => {}
  },
  signOut: () => Promise.resolve(),
}

// Mock Firebase Firestore for tests
const mockFirestore = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: false, data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    }),
    add: () => Promise.resolve({ id: 'mock-id' }),
    where: () => ({
      get: () => Promise.resolve({ docs: [] }),
    }),
  }),
}

// Mock Firebase modules
vi.mock('../firebase.js', () => ({
  auth: mockAuth,
  db: mockFirestore,
}))

// Global test utilities
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
