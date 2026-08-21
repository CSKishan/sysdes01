// Playwright smoke test for v0.2: the 9 new Chapter I levels (7 teach-only
// + CDN + Availability build stages) and the quiz flow. Complements
// scripts/playtest.mjs, which already covers the v0.1 core loop in full.

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

  async function completeTeachOnlyLevel(levelId) {
    await page.getByTestId(`play-${levelId}`).click()
    await page.waitForSelector('text=Continue')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('[data-testid="check-option-correct"]')
    await page.getByTestId('check-option-correct').click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
  }

  console.log('\n== Clearing Chapter 0 first (a prerequisite for Chapter I, already covered by playtest.mjs) ==')
  async function completeTeachOnlyLevelById(levelId) {
    await page.getByTestId(`play-${levelId}`).click()
    await page.waitForSelector('text=Continue')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('[data-testid="check-option-correct"]')
    await page.getByTestId('check-option-correct').click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector('text=Packet and Post')
  }
  for (const id of ['ch0-l1', 'ch0-l2', 'ch0-l3', 'ch0-l4', 'ch0-l5']) {
    await completeTeachOnlyLevelById(id)
  }

  console.log('\n== Chapter I now opens with the networking fundamentals ==')
  check('ch1-net-ip is first in Chapter I and unlocked', (await page.getByTestId('level-row-ch1-net-ip').getAttribute('data-unlocked')) === 'true')
  check('ch1-l1 (One Courier) starts locked -- now gated behind the new levels', (await page.getByTestId('level-row-ch1-l1').getAttribute('data-unlocked')) === 'false')

  console.log('\n== Playing the 4 networking teach-only levels ==')
  await completeTeachOnlyLevel('ch1-net-ip')
  await completeTeachOnlyLevel('ch1-net-osi')
  await completeTeachOnlyLevel('ch1-net-tcp-udp')
  await completeTeachOnlyLevel('ch1-net-dns')
  check('ch1-l1 (One Courier) now unlocked', (await page.getByTestId('level-row-ch1-l1').getAttribute('data-unlocked')) === 'true')

  console.log('\n== Fast-forwarding through the original 5 build levels (already covered by playtest.mjs) ==')
  async function quickGuidedBuild(levelId, situationText, teachText) {
    await page.getByTestId(`play-${levelId}`).click()
    await page.waitForSelector(`text=${situationText}`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForSelector(`text=${teachText}`)
    await page.getByTestId('check-option-correct').click()
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  // L1: guided drag-drop build (mechanics already proven in playtest.mjs).
  await quickGuidedBuild('ch1-l1', 'Time to build', 'The depot (server)')
  await page.waitForSelector('text=Open your first depot')
  const paletteDepot = page.locator('[draggable="true"]', { hasText: 'Depot' })
  const canvasPane = page.locator('.react-flow__pane')
  await paletteDepot.dragTo(canvasPane, { targetPosition: { x: 400, y: 200 } })
  await page.waitForTimeout(200)
  async function wire(fromLabel, toLabel) {
    const fromNode = page.locator('.react-flow__node', { hasText: fromLabel }).first()
    const toNode = page.locator('.react-flow__node', { hasText: toLabel }).last()
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
  await wire('Customers', 'Depot')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-l1 clears', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Packet and Post')

  // L2: vertical scaling via slider.
  await quickGuidedBuild('ch1-l2', 'Noon hits', 'Overload, and the quick fix')
  await page.waitForSelector('text=Survive the rush')
  await page.locator('.react-flow__node', { hasText: 'Depot' }).first().click()
  await page.waitForSelector('text=This node is fixed')
  const slider = page.locator('input[type="range"]').first()
  await slider.focus()
  for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-l2 clears', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Packet and Post')

  // L3: guided second depot.
  await quickGuidedBuild('ch1-l3', 'The ceiling', 'Horizontal scaling & the dispatcher')
  await page.waitForSelector('text=Open a second depot')
  const paletteDispatcher = page.locator('[draggable="true"]', { hasText: 'Dispatcher' })
  await paletteDispatcher.dragTo(canvasPane, { targetPosition: { x: 320, y: 150 } })
  await page.waitForTimeout(200)
  const paletteDepot3 = page.locator('[draggable="true"]', { hasText: 'Depot' })
  await paletteDepot3.dragTo(canvasPane, { targetPosition: { x: 560, y: 90 } })
  await page.waitForTimeout(200)
  await paletteDepot3.dragTo(canvasPane, { targetPosition: { x: 560, y: 230 } })
  await page.waitForTimeout(200)
  await wire('Customers', 'Dispatcher')
  const depotNodes = page.locator('.react-flow__node', { hasText: 'Depot' })
  for (let i = 0; i < (await depotNodes.count()); i++) {
    const dispatcherNode = page.locator('.react-flow__node', { hasText: 'Dispatcher' })
    const source = dispatcherNode.locator('.react-flow__handle-right')
    const target = depotNodes.nth(i).locator('.react-flow__handle-left')
    const sBox = await source.boundingBox()
    const tBox = await target.boundingBox()
    if (sBox && tBox) {
      await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
  }
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-l3 clears', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Packet and Post')

  console.log('\n== Clustering level now unlocked (follows L3) ==')
  check('ch1-clustering unlocked', (await page.getByTestId('level-row-ch1-clustering').getAttribute('data-unlocked')) === 'true')
  await completeTeachOnlyLevel('ch1-clustering')

  // L4: routing algorithms.
  await quickGuidedBuild('ch1-l4', 'Depot B keeps falling behind', 'Not all dispatch rules are equal')
  await page.waitForSelector('text=Fix the dispatch rule')
  const dispatcherNode4 = page.locator('.react-flow__node', { hasText: 'Dispatcher' })
  await dispatcherNode4.click()
  await page.waitForSelector('text=Dispatch rule')
  await page.locator('select').selectOption('leastConnections')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-l4 clears with least-connections', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Packet and Post')

  // L5: cache capstone -- guided + solo + twist (write-through this time, straight through).
  await quickGuidedBuild('ch1-l5', 'The same question', 'The shelf (cache)')
  await page.waitForSelector('text=Put in a shelf')
  const paletteShelf = page.locator('[draggable="true"]', { hasText: 'Shelf' })
  await paletteShelf.dragTo(canvasPane, { targetPosition: { x: 280, y: 160 } })
  await page.waitForTimeout(200)
  await wire('Customers', 'Shelf')
  await wire('Shelf', 'Storeroom')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-l5 guided clears', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=A new branch, same trick')
  const paletteShelf2 = page.locator('[draggable="true"]', { hasText: 'Shelf' })
  await paletteShelf2.dragTo(canvasPane, { targetPosition: { x: 280, y: 160 } })
  await page.waitForTimeout(200)
  await wire('Customers', 'Shelf')
  await wire('Shelf', 'Storeroom')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Your call')
  await page.getByRole('button', { name: /Write-through/ }).click()
  await page.getByRole('button', { name: 'Build it' }).click()
  await page.waitForSelector('text=The price just changed')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-l5 twist clears with write-through', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Packet and Post')

  console.log('\n== Proxy and Storage now unlocked (follow L5) ==')
  check('ch1-proxy unlocked', (await page.getByTestId('level-row-ch1-proxy').getAttribute('data-unlocked')) === 'true')
  await completeTeachOnlyLevel('ch1-proxy')
  await completeTeachOnlyLevel('ch1-net-storage')

  console.log('\n== CDN (build stage reusing cache mechanics) ==')
  check('ch1-cdn unlocked', (await page.getByTestId('level-row-ch1-cdn').getAttribute('data-unlocked')) === 'true')
  await page.getByTestId('play-ch1-cdn').click()
  await page.waitForSelector("text=It's not overloaded, it's just far")
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=CDN — a shelf at the edge')
  await page.getByTestId('check-option-correct').click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Put a locker near them')
  const paletteShelfCdn = page.locator('[draggable="true"]', { hasText: 'Shelf' })
  await paletteShelfCdn.dragTo(canvasPane, { targetPosition: { x: 280, y: 160 } })
  await page.waitForTimeout(200)
  await wire('Customers', 'Shelf')
  await wire('Shelf', 'Distant Depot')
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-cdn clears', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Packet and Post')

  console.log('\n== Availability (surfaces computeSystemAvailability end to end) ==')
  check('ch1-availability unlocked', (await page.getByTestId('level-row-ch1-availability').getAttribute('data-unlocked')) === 'true')
  await page.getByTestId('play-ch1-availability').click()
  await page.waitForSelector('text=You signed a contract')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Availability and the nines')
  await page.getByTestId('check-option-correct').click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Hit the number')

  // Single locked depot alone should fail first.
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO missed', { timeout: 8000 }).catch(() => {})
  check('ch1-availability: single depot fails the contract as intended', await page.isVisible('text=SLO missed').catch(() => false))
  check('Availability stat visible on dashboard', await page.isVisible('text=Availability'))
  await page.getByRole('button', { name: 'Try again' }).click()

  // Delete the pre-existing direct Customers -> Depot wire first --
  // leaving it in place alongside a dispatcher would double-route traffic
  // to the locked depot instead of giving clean redundancy.
  const directEdge = page.locator('.react-flow__edge').first()
  await directEdge.click({ force: true })
  await page.waitForTimeout(150)
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(150)
  check('ch1-availability: direct edge removed before rewiring', (await page.locator('.react-flow__edge').count()) === 0)

  const paletteDispatcherAvail = page.locator('[draggable="true"]', { hasText: 'Dispatcher' })
  await paletteDispatcherAvail.dragTo(canvasPane, { targetPosition: { x: 320, y: 150 } })
  await page.waitForTimeout(200)
  const paletteDepotAvail = page.locator('[draggable="true"]', { hasText: 'Depot' })
  await paletteDepotAvail.dragTo(canvasPane, { targetPosition: { x: 560, y: 230 } })
  await page.waitForTimeout(200)
  // Rewire: Customers -> Dispatcher -> {existing locked Depot, new Depot}
  await wire('Customers', 'Dispatcher')
  const allDepots = page.locator('.react-flow__node', { hasText: 'Depot' })
  for (let i = 0; i < (await allDepots.count()); i++) {
    const dispatcherNode = page.locator('.react-flow__node', { hasText: 'Dispatcher' })
    const source = dispatcherNode.locator('.react-flow__handle-right')
    const target = allDepots.nth(i).locator('.react-flow__handle-left')
    const sBox = await source.boundingBox()
    const tBox = await target.boundingBox()
    if (sBox && tBox) {
      await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }
  }
  await page.getByRole('button', { name: '▶ Run' }).click()
  await page.waitForSelector('text=SLO met', { timeout: 8000 }).catch(() => {})
  check('ch1-availability: redundant depots clear the contract', await page.isVisible('text=SLO met').catch(() => false))
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForSelector('text=Packet and Post')

  console.log('\n== Quiz mode ==')
  await page.getByRole('button', { name: 'Quiz' }).click()
  await page.waitForSelector('text=Random mix')
  check('Quiz picker shows a non-trivial question count', await page.isVisible("text=available from what you've completed"))
  await page.getByRole('button', { name: /Random mix/ }).click()
  await page.waitForSelector('text=Question 1 of')
  let answered = 0
  for (let i = 0; i < 12; i++) {
    const doneVisible = await page.isVisible('text=Session complete').catch(() => false)
    if (doneVisible) break
    const optionButtons = page.locator('button').filter({ hasText: /.+/ })
    // Click the first plausible answer option (any of the 2-3 rendered choices).
    const questionPanel = page.locator('p.mb-5')
    if (!(await questionPanel.isVisible().catch(() => false))) break
    const choices = page.locator('button.border.px-4.py-2\\.5')
    const count = await choices.count()
    if (count === 0) break
    await choices.first().click()
    answered++
    const nextBtn = page.getByRole('button', { name: /Next question|See results/ })
    await nextBtn.click()
    await page.waitForTimeout(150)
  }
  check('Answered at least one quiz question', answered > 0)
  await page.waitForSelector('text=Session complete', { timeout: 5000 }).catch(() => {})
  check('Quiz session completes with a score summary', await page.isVisible('text=Session complete').catch(() => false))

  await browser.close()
  console.log(`\n${failures === 0 ? '✅ ALL v0.2 CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
