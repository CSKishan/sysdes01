import { NUMBERS_SECTIONS } from '@/content/numbers'
import { Panel } from '@/ui/shared/Panel'
import { LibraryLayout } from './LibraryLayout'

export function NumbersPage() {
  return (
    <LibraryLayout>
      <p className="mb-6 text-sm text-ink-400">
        Rules of thumb worth having memorized before an estimation exercise -- back-of-the-envelope
        capacity math starts here.
      </p>
      <div className="flex flex-col gap-6">
        {NUMBERS_SECTIONS.map((section) => (
          <Panel key={section.id} className="p-5">
            <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-widest text-brand-400">
              {section.title}
            </h2>
            <div className="flex flex-col divide-y divide-ink-800">
              {section.rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
                  <span className="text-sm text-ink-300">{row.label}</span>
                  <span className="text-right">
                    <span className="font-mono text-sm tabular-nums text-ink-100">{row.value}</span>
                    {row.note && <span className="ml-2 text-xs text-ink-500">{row.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </LibraryLayout>
  )
}
