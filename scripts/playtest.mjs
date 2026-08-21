// One-off Playwright script to drive the actual app in a real browser and
// verify the core loop works end to end. Not part of the automated test
// suite (no assertions framework, just console output) -- for manual
// verification during development.

import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'
let failures = 0

function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`)
  } else {
    console.log(`  ✗ ${label}`)
    failures++
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  })
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  page.on('pageerror', (err) => {
    console.log(`  ✗ PAGE ERROR: ${err.message}`)
    failures++
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`  ✗ CONSOLE ERROR: ${msg.text()}`)
      failures++
    }
  })

  await page.goto(BASE_URL)
  await page.waitForSelector('text=Packet and Post')

  console.log('\n== Chapter Map loads ==')
  check('Title visible', await page.isVisible('text=Packet and Post'))
  check('Chapter 0 visible', await page.isVisible('text=Getting Started'))
  check('Chapter I visible', await page.isVisible('text=Chapter I'))
  check('ch1-l1 starts locked', (await page.getByTestId('level-row-ch1-l1').getAttribute('data-unlocked')) === 'false')

  async function completeTeachOnlyLevel(levelId, expectedSituationText, expectedTeachText, correctAnswerText) {
    await page.getByTestId(`play-${levelId}`).click()
    await page.waitForSelector(`text=${expectedSituationText}`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector(`text=${expectedTeachText}`)
    await page.getByRole('button', { name: correctAnswerText }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
  }

  console.log('\n== Playing through Chapter 0 (5 teach-only levels) ==')
  await completeTeachOnlyLevel('ch0-l1', 'Welcome to Packet & Post', 'Request and response', 'The customer asking the question')
  check('ch0-l1 completed', (await page.getByTestId('level-row-ch0-l1').getAttribute('data-completed')) === 'true')
  check('ch0-l2 now unlocked', (await page.getByTestId('level-row-ch0-l2').getAttribute('data-unlocked')) === 'true')

  await completeTeachOnlyLevel('ch0-l2', 'Two very different complaints', 'Latency vs. throughput', 'Latency')
  await completeTeachOnlyLevel('ch0-l3', 'How busy is "busy"?', 'Requests per second', '5 rps')
  await completeTeachOnlyLevel('ch0-l4', 'The clerk has a limit', 'Utilization and overload', 'It gets much worse — not just a little worse')
  await completeTeachOnlyLevel('ch0-l5', 'One more thing before you start', 'The five numbers', 'Because it shows what the worst-off users actually experience')

  check('All Chapter 0 levels completed', (await page.getByTestId('level-row-ch0-l5').getAttribute('data-completed')) === 'true')
  check('ch1-net-ip now unlocked (first Chapter I level)', (await page.getByTestId('level-row-ch1-net-ip').getAttribute('data-unlocked')) === 'true')

  console.log('\n== Chapter I now opens with 4 networking fundamentals levels (covered by playtest-v02.mjs) ==')
  async function clearTeachOnlyLevel(levelId) {
    await page.getByTestId(`play-${levelId}`).click()
    await page.waitForSelector('text=Continue')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('[data-testid="check-option-correct"]')
    await page.getByTestId('check-option-correct').click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
  }
  for (const id of ['ch1-net-ip', 'ch1-net-osi', 'ch1-net-tcp-udp', 'ch1-net-dns']) {
    await clearTeachOnlyLevel(id)
  }

  console.log('\n== Playing Chapter I, Level 1 (One Courier -- guided canvas build) ==')
  await page.getByTestId('play-ch1-l1').click()
  await page.waitForSelector('text=Time to build')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=The depot (server)')
  await page.getByRole('button', { name: 'The path a request travels to reach the server' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForSelector('text=Open your first depot')
  check('Guided step panel visible', await page.isVisible("text=Let's build it together"))
  check('Palette shows Depot', await page.isVisible('text=Depot'))

  // Drag the palette's Depot item onto the canvas.
  const paletteDepot = page.locator('[draggable="true"]', { hasText: 'Depot' })
  const canvasPane = page.locator('.react-flow__pane')
  await paletteDepot.dragTo(canvasPane, { targetPosition: { x: 400, y: 200 } })
  await page.waitForTimeout(300)

  const depotNode = page.locator('.react-flow__node', { hasText: 'Depot' })
  check('Depot node appeared on canvas after drag', (await depotNode.count()) > 0)

  if ((await depotNode.count()) > 0) {
    // Connect Customers -> Depot by dragging from the source handle to the target handle.
    const customerNode = page.locator('.react-flow__node', { hasText: 'Customers' })
    const sourceHandle = customerNode.locator('.react-flow__handle-right')
    const targetHandle = depotNode.first().locator('.react-flow__handle-left')
    const sourceBox = await sourceHandle.boundingBox()
    const targetBox = await targetHandle.boundingBox()
    if (sourceBox && targetBox) {
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(300)
    }
    const edgeCount = await page.locator('.react-flow__edge').count()
    check('An edge now connects Customers to the Depot', edgeCount > 0)

    if (edgeCount > 0) {
      await page.getByRole('button', { name: '▶ Run' }).click()
      await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
      check('Debrief appeared after running', await page.isVisible('text=SLO met').catch(() => false))
      if (await page.isVisible('text=SLO met').catch(() => false)) {
        await page.getByRole('button', { name: 'Continue' }).click()
        await page.waitForSelector('text=Packet and Post')
        check('ch1-l1 marked complete', (await page.getByTestId('level-row-ch1-l1').getAttribute('data-completed')) === 'true')
        check('ch1-l2 now unlocked', (await page.getByTestId('level-row-ch1-l2').getAttribute('data-unlocked')) === 'true')
      }
    }
  }

  console.log('\n== Playing Chapter I, Level 2 (The Lunch Rush -- vertical scaling via slider) ==')
  await page.getByTestId('play-ch1-l2').click()
  await page.waitForSelector('text=Noon hits')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Overload, and the quick fix')
  await page.getByRole('button', { name: 'It makes one existing machine bigger, instead of adding more machines' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Survive the rush')

  // Click the pre-placed (locked) depot to open its inspector, then push
  // the capacity slider to the top with keyboard arrows for a reliable,
  // driver-independent interaction.
  const lockedDepot = page.locator('.react-flow__node', { hasText: 'Depot' }).first()
  await lockedDepot.click()
  await page.waitForSelector('text=This node is fixed for this level')
  const capacitySlider = page.locator('input[type="range"]').first()
  await capacitySlider.focus()
  for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowRight')

  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('L2: vertical scaling clears the SLO', await page.isVisible('text=SLO met').catch(() => false))
  if (await page.isVisible('text=SLO met').catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
  }

  console.log('\n== Playing Chapter I, Level 4 (Dispatch Rules -- algorithm dropdown) ==')
  // Level 3 requires another full guided drag-and-drop build (already
  // exercised in Level 1); jump to Level 4's reconfiguration puzzle to
  // cover a different interaction (fails as roundRobin, fixed via a select).
  // (Level 3 must still be completed first for Level 4 to unlock.)
  await page.getByTestId('play-ch1-l3').click()
  await page.waitForSelector('text=The ceiling')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Horizontal scaling & the dispatcher')
  await page
    .getByRole('button', { name: 'Something needs to know which depots exist and are free, and split traffic between them' })
    .click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Open a second depot')

  const paletteDispatcher = page.locator('[draggable="true"]', { hasText: 'Dispatcher' })
  const canvasPane3 = page.locator('.react-flow__pane')
  await paletteDispatcher.dragTo(canvasPane3, { targetPosition: { x: 320, y: 150 } })
  await page.waitForTimeout(200)
  const paletteDepot3 = page.locator('[draggable="true"]', { hasText: 'Depot' })
  await paletteDepot3.dragTo(canvasPane3, { targetPosition: { x: 560, y: 90 } })
  await page.waitForTimeout(200)
  await paletteDepot3.dragTo(canvasPane3, { targetPosition: { x: 560, y: 230 } })
  await page.waitForTimeout(200)

  async function wire(fromText, toText, xOffsetFrom, xOffsetTo) {
    const fromNode = page.locator('.react-flow__node', { hasText: fromText }).first()
    const toNode = page.locator('.react-flow__node', { hasText: toText }).last()
    const source = fromNode.locator('.react-flow__handle-right')
    const target = toNode.locator('.react-flow__handle-left')
    const sBox = await source.boundingBox()
    const tBox = await target.boundingBox()
    if (!sBox || !tBox) return false
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    return true
  }

  await wire('Customers', 'Dispatcher')
  const depotNodes3 = page.locator('.react-flow__node', { hasText: 'Depot' })
  const depotCount3 = await depotNodes3.count()
  for (let i = 0; i < depotCount3; i++) {
    const dispatcherNode = page.locator('.react-flow__node', { hasText: 'Dispatcher' })
    const target = depotNodes3.nth(i)
    const source = dispatcherNode.locator('.react-flow__handle-right')
    const targetHandle = target.locator('.react-flow__handle-left')
    const sBox = await source.boundingBox()
    const tBox = await targetHandle.boundingBox()
    if (sBox && tBox) {
      await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
  }
  check('L3: dispatcher wired to both depots', (await page.locator('.react-flow__edge').count()) >= 3)

  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('L3: two depots behind a dispatcher clears the SLO', await page.isVisible('text=SLO met').catch(() => false))
  if (await page.isVisible('text=SLO met').catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
  }

  await clearTeachOnlyLevel('ch1-clustering')

  await page.getByTestId('play-ch1-l4').click()
  await page.waitForSelector('text=Depot B keeps falling behind')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Not all dispatch rules are equal')
  await page.getByRole('button', { name: 'Least connections (least busy first)' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Fix the dispatch rule')

  // Round robin is the default and should fail first.
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO missed', { timeout: 8000 }).catch(() => {})
  check('L4: round robin (default) fails as intended', await page.isVisible('text=SLO missed').catch(() => false))
  await page.getByRole('button', { name: 'Try again' }).click()

  const dispatcherNode4 = page.locator('.react-flow__node', { hasText: 'Dispatcher' })
  await dispatcherNode4.click()
  await page.waitForSelector('text=Dispatch rule')
  await page.locator('select').selectOption('leastConnections')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('L4: switching to least-connections fixes it', await page.isVisible('text=SLO met').catch(() => false))
  if (await page.isVisible('text=SLO met').catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
  }

  console.log('\n== Playing Chapter I, Level 5 (The Shelf -- cache capstone, 3 build stages) ==')
  await page.getByTestId('play-ch1-l5').click()
  await page.waitForSelector('text=The same question, forty times an hour')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=The shelf (cache)')
  await page.getByRole('button', { name: 'A cache hit' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // --- guided build: shelf between customers and storeroom ---
  await page.waitForSelector('text=Put in a shelf')
  const paletteShelf = page.locator('[draggable="true"]', { hasText: 'Shelf' })
  const canvasPane5 = page.locator('.react-flow__pane')
  await paletteShelf.dragTo(canvasPane5, { targetPosition: { x: 280, y: 160 } })
  await page.waitForTimeout(200)

  async function wireByLabel(fromLabel, toLabel) {
    const fromNode = page.locator('.react-flow__node', { hasText: fromLabel }).first()
    const toNode = page.locator('.react-flow__node', { hasText: toLabel }).first()
    const source = fromNode.locator('.react-flow__handle-right')
    const target = toNode.locator('.react-flow__handle-left')
    const sBox = await source.boundingBox()
    const tBox = await target.boundingBox()
    if (!sBox || !tBox) return false
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    return true
  }

  await wireByLabel('Customers', 'Shelf')
  await wireByLabel('Shelf', 'Storeroom')
  check('L5 guided: shelf wired both directions', (await page.locator('.react-flow__edge').count()) >= 2)

  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('L5 guided: cache in front of slow storeroom clears the SLO', await page.isVisible('text=SLO met').catch(() => false))
  if (await page.isVisible('text=SLO met').catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  // --- solo build: same idea, no steps ---
  await page.waitForSelector('text=A new branch, same trick')
  const paletteShelf2 = page.locator('[draggable="true"]', { hasText: 'Shelf' })
  await paletteShelf2.dragTo(canvasPane5, { targetPosition: { x: 280, y: 160 } })
  await page.waitForTimeout(200)
  await wireByLabel('Customers', 'Shelf')
  await wireByLabel('Shelf', 'Storeroom')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('L5 solo: placed the shelf unaided and cleared the SLO', await page.isVisible('text=SLO met').catch(() => false))
  if (await page.isVisible('text=SLO met').catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  // --- twist: the decision card, choose write-around (should breach staleness) ---
  await page.waitForSelector('text=Your call')
  check('L5 twist: decision card shown', await page.isVisible('text=Your call'))
  await page.getByRole('button', { name: /Write-around/ }).click()
  await page.getByRole('button', { name: 'Build it' }).click()
  await page.waitForSelector('text=The price just changed')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO missed', { timeout: 8000 }).catch(() => {})
  check('L5 twist: write-around breaches the stale-read SLO as intended', await page.isVisible('text=SLO missed').catch(() => false))
  check('L5 twist: stale reads check shown in scorecard', await page.isVisible('text=Stale reads').catch(() => false))

  console.log('\n== Retrying the twist with a different choice ==')
  await page.getByRole('button', { name: 'Try again' }).click()
  await page.waitForSelector('text=Your call')
  check('Retry re-shows the decision card', await page.isVisible('text=Your call'))
  await page.getByRole('button', { name: /Write-through/ }).click()
  await page.getByRole('button', { name: 'Build it' }).click()
  await page.waitForSelector('text=The price just changed')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('Write-through on retry clears the SLO', await page.isVisible('text=SLO met').catch(() => false))
  if (await page.isVisible('text=SLO met').catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
    check('ch1-l5 marked complete after passing', (await page.getByTestId('level-row-ch1-l5').getAttribute('data-completed')) === 'true')
  }

  console.log('\n== Decision journal captured the L5 choice ==')
  const journalRaw = await page.evaluate(() => localStorage.getItem('packet-and-post.journal'))
  const journal = journalRaw ? JSON.parse(journalRaw) : { state: { entries: [] } }
  const entries = journal.state?.entries ?? []
  check('At least one journal entry recorded', entries.length >= 1)
  check(
    'Entry references the write-around choice',
    entries.some((e) => /write-around/i.test(e.choiceLabel)),
  )
  check(
    'Entry carries a rule-of-thumb takeaway',
    entries.some((e) => typeof e.ruleDerived === 'string' && e.ruleDerived.length > 10),
  )

  await browser.close()
  console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED (full campaign smoke test)' : `❌ ${failures} CHECK(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)

  console.log('\n== Sandbox mode loads ==')
  await page.getByRole('button', { name: 'Sandbox' }).click()
  await page.waitForSelector('text=Build anything')
  check('Sandbox screen loads', await page.isVisible('text=Build anything'))
  await page.getByRole('button', { name: '← Map' }).click()

  console.log('\n== Journal loads ==')
  await page.getByRole('button', { name: 'Journal' }).click()
  await page.waitForSelector('text=decision journal')
  check('Journal screen loads', await page.isVisible('text=decision journal'))

  await browser.close()

  console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
