// Static reference tables -- "numbers every engineer should know" (Phase
// 1.7). Not derived from the engine; these are industry rules of thumb, the
// same ones used to sanity-check the estimation work Phase 8 will build on.

export interface NumberRow {
  label: string
  value: string
  note?: string
}

export const LATENCY_LADDER: NumberRow[] = [
  { label: 'L1 cache reference', value: '~1 ns' },
  { label: 'Branch mispredict', value: '~5 ns' },
  { label: 'L2 cache reference', value: '~4 ns' },
  { label: 'Mutex lock/unlock', value: '~25 ns' },
  { label: 'Main memory reference', value: '~100 ns', note: '~40x L2 cache' },
  { label: 'Compress 1 KB (Snappy)', value: '~3,000 ns (3 μs)' },
  { label: 'Send 1 KB over 1 Gbps network', value: '~10,000 ns (10 μs)' },
  { label: 'Read 1 MB sequentially from memory', value: '~250,000 ns (250 μs)' },
  { label: 'Round trip within the same datacenter', value: '~500,000 ns (500 μs)' },
  { label: 'Read 1 MB sequentially from SSD', value: '~1,000,000 ns (1 ms)' },
  { label: 'Disk seek', value: '~10,000,000 ns (10 ms)' },
  { label: 'Read 1 MB sequentially from disk', value: '~20,000,000 ns (20 ms)' },
  { label: 'Send packet CA -> Netherlands -> CA', value: '~150,000,000 ns (150 ms)' },
]

export const POWERS_OF_TWO: NumberRow[] = [
  { label: '2^10', value: '1 KB', note: '1,024' },
  { label: '2^16', value: '64 KB', note: 'max value of a 16-bit int' },
  { label: '2^20', value: '1 MB', note: '1,048,576' },
  { label: '2^30', value: '1 GB' },
  { label: '2^32', value: '4 GB', note: 'max value of a 32-bit int; also roughly IPv4\'s address space' },
  { label: '2^40', value: '1 TB' },
  { label: '2^50', value: '1 PB' },
]

export const AVAILABILITY_TABLE: NumberRow[] = [
  { label: '90% ("one nine")', value: '~36.5 days/year downtime' },
  { label: '99% ("two nines")', value: '~3.65 days/year downtime' },
  { label: '99.9% ("three nines")', value: '~8.77 hours/year downtime' },
  { label: '99.99% ("four nines")', value: '~52.6 minutes/year downtime' },
  { label: '99.999% ("five nines")', value: '~5.26 minutes/year downtime' },
  { label: '99.9999% ("six nines")', value: '~31.5 seconds/year downtime' },
]

export const CAPACITY_FIGURES: NumberRow[] = [
  { label: 'Seconds per day', value: '86,400', note: 'round to ~100,000 for quick mental math' },
  { label: 'Seconds per month', value: '~2.6 million' },
  { label: 'A single beefy server', value: '~1,000-10,000 rps', note: 'for simple, cache-friendly requests' },
  { label: 'A single SQL database', value: '~1,000-10,000 simple writes/sec', note: 'before it needs sharding or read replicas' },
  { label: 'A single SSD', value: '~500 MB/s - 3.5 GB/s sequential' },
  { label: 'Typical mobile payload budget', value: '~1-2 MB per page load', note: 'past this, users on slower networks feel it' },
]

export interface NumbersSection {
  id: string
  title: string
  rows: NumberRow[]
}

export const NUMBERS_SECTIONS: NumbersSection[] = [
  { id: 'latency', title: 'Latency ladder', rows: LATENCY_LADDER },
  { id: 'powers-of-two', title: 'Powers of two', rows: POWERS_OF_TWO },
  { id: 'availability', title: 'Availability & the nines', rows: AVAILABILITY_TABLE },
  { id: 'capacity', title: 'Capacity figures', rows: CAPACITY_FIGURES },
]
