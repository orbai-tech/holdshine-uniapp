/**
 * 防抖/节流工具自动化测试。
 * 运行：npm run test:timing
 * 原理：替换全局 Date.now / setTimeout / clearTimeout 为可控时钟，
 *      精确推进时间验证 debounce / throttle 的各种边界语义。
 */
import assert from 'node:assert/strict'
import { createDebounced, debounce, throttle } from '../src/utils/timing.ts'

// ---------------------------------------------------------------------------
// 可控时钟（fake timers）
// ---------------------------------------------------------------------------
const realDateNow = Date.now
const realSetTimeout = globalThis.setTimeout
const realClearTimeout = globalThis.clearTimeout

let now = 0
let nextId = 1
const queue = new Map<number, { at: number; fn: () => void }>()

function installFakeTimers() {
  now = 0
  nextId = 1
  queue.clear()
  globalThis.Date.now = () => now
  ;(globalThis as unknown as Record<string, unknown>).setTimeout = (
    fn: () => void,
    ms = 0,
  ) => {
    const id = nextId++
    queue.set(id, { at: now + ms, fn })
    return id
  }
  ;(globalThis as unknown as Record<string, unknown>).clearTimeout = (id: number) => {
    queue.delete(id)
  }
}

/** 推进时钟并触发所有到期任务（新产生的到期任务会继续执行） */
function advance(ms: number) {
  now += ms
  for (;;) {
    const due = [...queue.entries()]
      .filter(([, q]) => q.at <= now)
      .sort((a, b) => a[1].at - b[1].at)
    if (due.length === 0) break
    const [id, q] = due[0]
    queue.delete(id)
    q.fn()
  }
}

function restoreRealTimers() {
  globalThis.Date.now = realDateNow
  globalThis.setTimeout = realSetTimeout
  globalThis.clearTimeout = realClearTimeout
}

// ---------------------------------------------------------------------------
// 测试用例
// ---------------------------------------------------------------------------
const cases: Array<{ name: string; run: () => Promise<void> | void }> = []

function test(name: string, run: () => Promise<void> | void) {
  cases.push({ name, run })
}

test('① trailing 防抖：连续调用只执行最后一次', () => {
  installFakeTimers()
  let calls = 0
  const run = debounce(() => {
    calls++
  }, 300)

  run()
  run()
  run()
  assert.equal(calls, 0, '等待期内不应执行')
  advance(299)
  assert.equal(calls, 0, '不足 300ms 不应执行')
  advance(1)
  assert.equal(calls, 1, '静默满 300ms 后仅执行一次')
  assert.equal(run.pending(), false, '执行后不应再处于挂起状态')
  advance(300)
  assert.equal(calls, 1, '执行后不应重复触发')
})

test('② trailing 防抖：静默期内再次调用会重置计时', () => {
  installFakeTimers()
  let calls = 0
  const run = debounce(() => {
    calls++
  }, 100)

  run()
  advance(90)
  run() // 重置计时
  advance(99)
  assert.equal(calls, 0, '重置后需重新等待 100ms')
  advance(1)
  assert.equal(calls, 1)
})

test('③ leading 防抖：窗口起点立即执行，窗口结束补执行最后一次', () => {
  installFakeTimers()
  const seq: string[] = []
  const run = debounce(() => seq.push('run'), 100, { leading: true })

  run()
  assert.deepEqual(seq, ['run'], 'leading：首次调用立即执行')
  run()
  run()
  advance(100)
  assert.deepEqual(seq, ['run', 'run'], 'trailing：补执行最后一次')
})

test('④ maxWait 防饥饿：持续触发时强制每 maxWait 执行一次', () => {
  installFakeTimers()
  let calls = 0
  const run = debounce(
    () => {
      calls++
    },
    200,
    { maxWait: 500 },
  )

  run() // t=0
  advance(100)
  run() // 持续触发，trailing 被不断推迟
  advance(100)
  run()
  advance(100)
  run()
  advance(100)
  run()
  assert.equal(calls, 0, '400ms 时 trailing 尚未到期')
  advance(101) // t=501 > maxWait=500
  assert.equal(calls, 1, 'maxWait 到期强制执行一次')
  assert.equal(run.pending(), false)
})

test('⑤ throttle：窗口内调用被抑制，窗口边界执行', () => {
  installFakeTimers()
  let calls = 0
  const run = throttle(() => {
    calls++
  }, 200)

  // t=0 起每 50ms 调用一次，共 10 次（t=0..450）
  for (let i = 0; i < 10; i++) {
    run()
    advance(50)
  }
  // leading: t=0；之后每 200ms 窗口起点执行一次：t=200、t=400
  assert.equal(calls, 3, '10 次调用只执行 3 次（每 200ms 至多一次）')
})

test('⑥ throttle trailing=false：窗口内调用被直接丢弃', () => {
  installFakeTimers()
  let calls = 0
  const run = throttle(
    () => {
      calls++
    },
    200,
    { trailing: false },
  )

  run() // t=0 leading
  assert.equal(calls, 1)
  advance(50)
  run() // 窗口内，被抑制且不调度 trailing
  advance(300) // 窗口结束
  assert.equal(calls, 1, 'trailing=false 时窗口内调用不补执行')
  run() // t=350，距上次执行已过窗口 → leading 再次执行
  assert.equal(calls, 2)
})

test('⑦ throttle leading=false：等价于带 maxWait 的防抖', () => {
  installFakeTimers()
  let calls = 0
  const run = throttle(
    () => {
      calls++
    },
    200,
    { leading: false },
  )

  run() // t=0
  advance(50)
  run()
  advance(100)
  run()
  assert.equal(calls, 0, 'leading=false：首次调用不立即执行')
  advance(51) // t=201，maxWait=200 到期
  assert.equal(calls, 1, '每 maxWait 至少执行一次')
})

test('⑧ cancel：取消后不执行，挂起 Promise 以 undefined 结算', async () => {
  installFakeTimers()
  let calls = 0
  const run = debounce(() => {
    calls++
  }, 100)

  const p = run()
  assert.equal(run.pending(), true)
  run.cancel()
  assert.equal(run.pending(), false)
  const v = await p
  assert.equal(v, undefined, 'cancel 后调用应结算为 undefined')
  advance(300)
  assert.equal(calls, 0, 'cancel 后不应执行')
})

test('⑨ flush：立即执行挂起调用并返回其结果，且不重复执行', async () => {
  installFakeTimers()
  let calls = 0
  const run = debounce(() => {
    calls++
    return 'ok'
  }, 100)

  run()
  const flushed = await run.flush()
  assert.equal(calls, 1, 'flush 立即执行')
  assert.equal(flushed, 'ok', 'flush 返回 fn 的结果')
  assert.equal(run.pending(), false)
  const idle = await run.flush()
  assert.equal(idle, undefined, '无挂起调用时 flush 返回 undefined')
  advance(200)
  assert.equal(calls, 1, 'flush 后原定时器不应再触发')
})

test('⑩ 参数透传 + Promise 结算为最终执行的结果', async () => {
  installFakeTimers()
  const seen: Array<[string, number]> = []
  const run = debounce((label: string, value: number) => {
    seen.push([label, value])
    return value * 2
  }, 50)

  const p1 = run('a', 1)
  const p2 = run('b', 2)
  const p3 = run('c', 3)
  assert.deepEqual(seen, [], '等待期内不执行')
  advance(50)
  assert.deepEqual(seen, [['c', 3]], '仅执行最后一次参数')
  assert.equal(await p1, 6, '早先调用的 Promise 也结算为最终结果')
  assert.equal(await p2, 6)
  assert.equal(await p3, 6)
})

test('⑪ createDebounced 兼容旧 API：trailing 防抖', () => {
  installFakeTimers()
  let calls = 0
  const run = createDebounced(() => {
    calls++
  }, 100)

  run()
  run()
  run()
  assert.equal(calls, 0)
  advance(100)
  assert.equal(calls, 1)
})

test('⑫ fn 抛错：调用方 Promise 收到 reject 而非悬挂', async () => {
  installFakeTimers()
  const run = debounce(() => {
    throw new Error('boom')
  }, 50)

  const p = run()
  advance(50)
  await assert.rejects(p, /boom/, '同步异常应 reject 调用方 Promise')
  assert.equal(run.pending(), false, '异常后状态应复位')
})

// ---------------------------------------------------------------------------
// 执行
// ---------------------------------------------------------------------------
let failed = 0
for (const c of cases) {
  try {
    await c.run()
    console.log(`  ✓ ${c.name}`)
  } catch (error) {
    failed++
    console.error(`  ✗ ${c.name}`)
    console.error(error)
  }
}

restoreRealTimers()

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} 个用例失败`)
  process.exit(1)
}
console.log(`\n全部 ${cases.length} 个用例通过 ✔`)
