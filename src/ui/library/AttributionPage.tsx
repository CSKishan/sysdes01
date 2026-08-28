import { ExternalLink, AlertTriangle } from 'lucide-react'
import { Panel } from '@/ui/shared/Panel'
import { LibraryLayout } from './LibraryLayout'

const SOURCE_URL = 'https://github.com/karanpratapsingh/system-design'
const LICENSE_URL = `${SOURCE_URL}/blob/main/LICENSE`

export function AttributionPage() {
  return (
    <LibraryLayout>
      <div className="flex flex-col gap-4">
        <Panel className="p-5">
          <h2 className="mb-3 font-mono text-sm font-semibold uppercase tracking-widest text-brand-400">
            Source material
          </h2>
          <p className="text-sm text-ink-300">
            Every level's taught concept, verbatim README quote, and real-world examples are drawn
            from{' '}
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-400 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-300"
            >
              karanpratapsingh/system-design
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
            , by Karan Pratap Singh. The delivery-company analogies, the simulation engine, the game
            mechanics, and every line of code are original to this project -- but the underlying
            curriculum and every quoted passage are that repository's, credited here and inline
            throughout ("Chapter I · Caching" etc.) rather than paraphrased.
          </p>
        </Panel>

        <Panel className="border-warn-500/40 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-widest text-warn-500">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
            License status
          </h2>
          <p className="mb-3 text-sm text-ink-300">
            The source repository is licensed{' '}
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-400 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-300"
            >
              Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC
              BY-NC-ND 4.0)
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
            . That license permits sharing the material for non-commercial purposes with
            attribution, but explicitly does <strong className="text-ink-100">not</strong> permit
            distributing adapted or derivative versions of it.
          </p>
          <p className="mb-3 text-sm text-ink-300">
            This project restructures that curriculum into an interactive game -- new framing, new
            analogies, an original simulation engine -- while still reproducing verbatim quotes and
            following the source's chapter structure and topic list closely. Whether that counts as
            a "derivative work" under CC BY-NC-ND, and whether this project's own distribution is
            "non-commercial," are legal questions this page can't settle on its own behalf.
          </p>
          <p className="text-sm text-ink-300">
            If you're deciding whether to publish, share, or build on this project further: read the
            license yourself, and consider reaching out to the original author for explicit
            permission before any wider release. This page exists so that question isn't silently
            skipped, not to answer it.
          </p>
        </Panel>
      </div>
    </LibraryLayout>
  )
}
