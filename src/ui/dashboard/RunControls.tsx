import type { PlaybackStatus } from './useSimulationPlayback'
import { Button } from '@/ui/shared/Button'

export function RunControls({
  status,
  onRun,
  onReset,
  disabled,
}: {
  status: PlaybackStatus
  onRun: () => void
  onReset: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Button onClick={onRun} disabled={disabled || status === 'running'}>
        {status === 'running' ? 'Running…' : status === 'done' ? 'Run again' : '▶ Run'}
      </Button>
      {status !== 'idle' && (
        <Button variant="ghost" onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  )
}
