import type { ComponentKind } from '@/engine/types'
import { COMPONENT_REGISTRY } from '@/engine/components'
import { COMPONENT_ICONS } from './componentIcons'
import { Panel } from '@/ui/shared/Panel'

export const PALETTE_DRAG_MIME = 'application/packet-and-post-component'

export function Palette({
  unlockedKinds,
  onAddComponent,
}: {
  unlockedKinds: ComponentKind[]
  /** Places the component near the canvas center -- the keyboard/click path
   * for adding a component, alongside dragging. Without this, the canvas
   * had no way to place a node at all without a mouse. */
  onAddComponent: (kind: ComponentKind) => void
}) {
  const placeable = unlockedKinds.filter((k) => k !== 'client')

  if (placeable.length === 0) return null

  return (
    <Panel className="w-48 shrink-0 p-3">
      <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-wide text-brand-500">
        Drag onto map, or click to add
      </p>
      <div className="flex flex-col gap-2">
        {placeable.map((kind) => {
          const def = COMPONENT_REGISTRY[kind]
          const Icon = COMPONENT_ICONS[kind]
          return (
            <button
              key={kind}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(PALETTE_DRAG_MIME, kind)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => onAddComponent(kind)}
              className="flex cursor-grab items-center gap-2.5 border border-ink-700 bg-ink-800 px-2.5 py-2 text-left transition-colors hover:border-brand-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 active:cursor-grabbing"
              title={`${def.shortDescription} Press Enter to add it to the canvas.`}
            >
              <Icon className="h-4 w-4 shrink-0 text-brand-500" strokeWidth={1.6} />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-ink-100">{def.analogyName}</p>
                <p className="truncate font-mono text-[9px] uppercase tracking-wide text-ink-400">
                  {def.realName}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
