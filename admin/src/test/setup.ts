// Vitest + RTL setup: jest-dom матчеры + автоочистка DOM между тестами.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
