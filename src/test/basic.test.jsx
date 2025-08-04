import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Simple test component
function TestComponent() {
  return <div>Hello Test</div>
}

describe('Basic Test Setup', () => {
  it('should render a test component', () => {
    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    )

    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })

  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
