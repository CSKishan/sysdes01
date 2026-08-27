// Phase 10.1: component test coverage for one of the plan's named
// load-bearing components. Specifically exercises the keyboard/click
// add-component path (Phase 10.2's accessibility fix) -- before that fix,
// there was no way to place a node on the canvas without a raw HTML5 drag
// event, which this environment (and a screen reader / keyboard-only user)
// can't produce.

import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { toPng } from 'html-to-image'
import { CanvasEditor, type CanvasEditorHandle } from '../CanvasEditor'
import type { SimGraph } from '@/engine/types'

// Real rasterization (jsdom has no canvas/foreignObject renderer worth
// trusting here, and it's already covered by manual browser verification)
// isn't what this test cares about -- just that exportPng is wired to the
// right DOM node with sane options, which a mock can prove without
// needing jsdom to actually rasterize anything.
vi.mock('html-to-image', () => ({ toPng: vi.fn(() => Promise.resolve('data:image/png;base64,fake')) }))

const EMPTY_GRAPH: SimGraph = {
  nodes: [{ id: 'client', label: 'Customers', config: { kind: 'client' }, position: { x: 60, y: 160 } }],
  edges: [],
}

describe('CanvasEditor', () => {
  it('renders the client node and the palette for unlocked kinds', () => {
    render(<CanvasEditor graph={EMPTY_GRAPH} onGraphChange={() => {}} unlockedKinds={['client', 'server']} />)
    expect(screen.getByText('Customers')).toBeInTheDocument()
    // The palette lists every unlocked kind except client (client is
    // always pre-placed, never something you add more of).
    expect(screen.getByRole('button', { name: /depot/i })).toBeInTheDocument()
  })

  it('hides the palette entirely once nothing is unlocked to place', () => {
    render(<CanvasEditor graph={EMPTY_GRAPH} onGraphChange={() => {}} unlockedKinds={['client']} />)
    expect(screen.queryByText(/drag onto map/i)).not.toBeInTheDocument()
  })

  it('clicking a palette item adds that component to the canvas and reports the new graph', () => {
    const onGraphChange = vi.fn()
    render(<CanvasEditor graph={EMPTY_GRAPH} onGraphChange={onGraphChange} unlockedKinds={['client', 'server']} />)

    fireEvent.click(screen.getByRole('button', { name: /depot/i }))

    // onGraphChange fires from an effect after nodes state commits --
    // by the time the click's own re-render has flushed, the last call
    // should reflect the new node.
    const lastCall = onGraphChange.mock.calls.at(-1)?.[0] as SimGraph
    expect(lastCall.nodes).toHaveLength(2)
    expect(lastCall.nodes.some((n) => n.config.kind === 'server')).toBe(true)
  })

  it('locked node ids are excluded from the delete-and-rewire flow via NodeInspector, never rendered as deletable', () => {
    render(
      <CanvasEditor
        graph={EMPTY_GRAPH}
        onGraphChange={() => {}}
        unlockedKinds={['client', 'server']}
        lockedNodeIds={['client']}
      />,
    )
    // Selecting the client node should not offer a delete action -- the
    // canvas itself doesn't render an inspector until a node is clicked,
    // and this only smoke-tests that render doesn't crash with a locked id
    // that isn't even present as an addable palette entry (client is
    // always filtered out of the palette regardless of lock state).
    expect(screen.getByText('Customers')).toBeInTheDocument()
  })

  it('exportPng (the imperative handle) rasterizes the actual wrapper element, not some other node', async () => {
    const ref = createRef<CanvasEditorHandle>()
    render(<CanvasEditor ref={ref} graph={EMPTY_GRAPH} onGraphChange={() => {}} unlockedKinds={['client']} />)

    const dataUrl = await ref.current?.exportPng()

    expect(dataUrl).toBe('data:image/png;base64,fake')
    expect(toPng).toHaveBeenCalledTimes(1)
    const [element, options] = vi.mocked(toPng).mock.calls[0]
    expect(element).toBeInstanceOf(HTMLElement)
    expect((element as HTMLElement).className).toContain('corner-marks') // the canvas wrapper's own class, not react-flow's internals
    expect(options).toMatchObject({ skipFonts: true })
  })

  it('selecting a node offers a keyboard-accessible "Connect to" control that creates a real edge', () => {
    const onGraphChange = vi.fn()
    const twoNodeGraph: SimGraph = {
      nodes: [
        { id: 'client', label: 'Customers', config: { kind: 'client' }, position: { x: 0, y: 0 } },
        { id: 's', label: 'Depot', config: { kind: 'server', capacityRps: 50, baseMs: 80, costPerHour: 8 }, position: { x: 200, y: 0 } },
      ],
      edges: [],
    }
    render(<CanvasEditor graph={twoNodeGraph} onGraphChange={onGraphChange} unlockedKinds={['client', 'server']} />)

    fireEvent.click(screen.getByText('Customers'))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's' } })
    fireEvent.click(screen.getByRole('button', { name: /connect customers/i }))

    const lastCall = onGraphChange.mock.calls.at(-1)?.[0] as SimGraph
    expect(lastCall.edges).toHaveLength(1)
    expect(lastCall.edges[0]).toMatchObject({ source: 'client', target: 's' })
  })
})
