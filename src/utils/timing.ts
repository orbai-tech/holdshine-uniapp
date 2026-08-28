/**
 * 时间控制工具：防抖（debounce）与节流（throttle）。
 *
 * 统一返回 TimingFn 对象，支持：
 * - 参数透传：f(...args) 与 fn 同参
 * - Promise 返回：每次调用返回的 Promise 在该次触发真正执行时结算
 * - cancel / flush / pending：取消挂起调度 / 立即执行挂起调用 / 查询挂起状态
 */

export type TimingFn<A extends unknown[] = [], R = void> = {
  (...args: A): Promise<R>
  /** 取消尚未执行的调度；挂起的调用以 undefined 结算，避免 Promise 悬挂 */
  cancel: () => void
  /** 若存在挂起调用则立即执行并返回其结果；否则返回 undefined */
  flush: () => Promise<R | undefined>
  /** 当前是否存在尚未执行的挂起调用 */
  pending: () => boolean
}

export interface DebounceOptions {
  /** 时间窗口开始时是否立即执行一次（默认 false） */
  leading?: boolean
  /** 静默满 waitMs 后是否执行最后一次（默认 true） */
  trailing?: boolean
  /** 最大等待时间：持续触发时强制在 maxWait 内执行一次，防止饥饿（默认 0 = 不限制） */
  maxWait?: number
}

export interface ThrottleOptions {
  /** 窗口开始时是否执行（默认 true） */
  leading?: boolean
  /** 窗口结束时是否补执行最后一次（默认 true） */
  trailing?: boolean
}

/**
 * 防抖：把高频连续触发收敛为"最后一次"（trailing）或"第一次"（leading）。
 *
 * 典型场景：搜索输入、窗口 resize、表单校验、以及网络抖动下的重复请求合并。
 *
 * 示例：
 *   const run = debounce((q: string) => search(q), 300)
 *   input.addEventListener('input', (e) => run(e.target.value))
 *
 * 网络抖动补充：
 *   - 设 maxWait 可保证"持续触发时也至少每 maxWait 执行一次"，避免弱网下
 *     请求被无限推迟导致的结果迟迟不刷新；
 *   - 返回的 Promise 可配合 pending()/flush() 在页面 onHide/onUnload 时兜底。
 */
export function debounce<A extends unknown[], R>(
  fn: (...args: A) => R | Promise<R>,
  waitMs: number,
  options: DebounceOptions = {},
): TimingFn<A, R> {
  const { leading = false, trailing = true, maxWait = 0 } = options
  const hasMaxWait = maxWait > 0

  let timer: ReturnType<typeof setTimeout> | null = null
  let maxTimer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: A | null = null
  let pending = false
  let hasInvoked = false
  let lastInvokeAt = 0
  let windowStartAt = 0
  let resolvers: Array<(v: R) => void> = []
  let rejecters: Array<(e: unknown) => void> = []

  function clearTimers() {
    if (timer != null) clearTimeout(timer)
    if (maxTimer != null) clearTimeout(maxTimer)
    timer = null
    maxTimer = null
  }

  function invoke() {
    if (!pending) return
    pending = false
    clearTimers()
    lastInvokeAt = Date.now()
    hasInvoked = true
    const args = lastArgs as A
    const rs = resolvers
    const rjs = rejecters
    resolvers = []
    rejecters = []
    let value: R | Promise<R>
    try {
      value = fn(...args)
    } catch (error) {
      rjs.forEach((r) => r(error))
      return
    }
    Promise.resolve(value).then(
      (v) => rs.forEach((r) => r(v)),
      (e) => rjs.forEach((r) => r(e)),
    )
  }

  /** trailing 定时器：每次触发都重置，静默满 waitMs 后执行最后一次 */
  function scheduleTrailing() {
    if (timer != null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (pending && trailing) invoke()
    }, waitMs)
  }

  /** maxWait 定时器：从"窗口起点/上次执行"起计时，到期强制执行一次 */
  function scheduleMaxWait() {
    if (!hasMaxWait || maxTimer != null) return
    const base = hasInvoked ? lastInvokeAt : windowStartAt
    const delay = Math.max(0, maxWait - (Date.now() - base))
    maxTimer = setTimeout(() => {
      maxTimer = null
      if (pending) invoke()
    }, delay)
  }

  function run(...args: A): Promise<R> {
    lastArgs = args
    return new Promise<R>((resolve, reject) => {
      resolvers.push(resolve)
      rejecters.push(reject)

      // leading：窗口起点（且非挂起状态）时立即执行；首次调用恒执行
      if (leading && !pending && (!hasInvoked || Date.now() - lastInvokeAt >= waitMs)) {
        pending = true
        invoke()
        return
      }

      const wasIdle = !pending
      pending = true
      if (wasIdle) windowStartAt = Date.now()
      scheduleTrailing()
      scheduleMaxWait()
    })
  }

  run.cancel = () => {
    clearTimers()
    pending = false
    lastArgs = null
    const rs = resolvers
    const rjs = rejecters
    resolvers = []
    rejecters = []
    rs.forEach((r) => r(undefined as unknown as R))
  }

  run.flush = () => {
    if (!pending) return Promise.resolve(undefined as unknown as R)
    return new Promise<R>((resolve, reject) => {
      resolvers.push(resolve)
      rejecters.push(reject)
      invoke()
    })
  }

  run.pending = () => pending

  return run
}

/**
 * 节流：把高频连续触发限制为"每 waitMs 至多执行一次"。
 *
 * 默认 leading + trailing：窗口起点立即执行一次，窗口结束若有被抑制的调用
 * 再补执行最后一次。相比防抖更适合"需要持续响应、但不能过密"的场景，
 * 例如滚动加载、心跳上报、位置上报。
 *
 * 示例：
 *   const run = throttle(() => sendHeartbeat(), 1000)
 *   ws.onmessage = () => run()
 */
export function throttle<A extends unknown[], R>(
  fn: (...args: A) => R | Promise<R>,
  waitMs: number,
  options: ThrottleOptions = {},
): TimingFn<A, R> {
  const { leading = true, trailing = true } = options

  // leading=false 时语义等价于"带 maxWait 的防抖"：每 waitMs 至少执行一次
  if (!leading) {
    return debounce(fn, waitMs, { leading: false, trailing, maxWait: waitMs })
  }

  let lastArgs: A | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending = false
  let hasInvoked = false
  let lastInvokeAt = 0
  let resolvers: Array<(v: R) => void> = []
  let rejecters: Array<(e: unknown) => void> = []

  function clearTimer() {
    if (timer != null) clearTimeout(timer)
    timer = null
  }

  function invoke() {
    const args = lastArgs as A
    pending = false
    clearTimer()
    lastInvokeAt = Date.now()
    hasInvoked = true
    const rs = resolvers
    const rjs = rejecters
    resolvers = []
    rejecters = []
    let value: R | Promise<R>
    try {
      value = fn(...args)
    } catch (error) {
      rjs.forEach((r) => r(error))
      return
    }
    Promise.resolve(value).then(
      (v) => rs.forEach((r) => r(v)),
      (e) => rjs.forEach((r) => r(e)),
    )
  }

  function run(...args: A): Promise<R> {
    lastArgs = args
    const now = Date.now()
    return new Promise<R>((resolve, reject) => {
      resolvers.push(resolve)
      rejecters.push(reject)

      // 距上次执行已满 waitMs（或首次调用）：立即执行（leading 语义，亦是窗口起点）
      if (!hasInvoked || now - lastInvokeAt >= waitMs) {
        invoke()
        return
      }

      // 窗口内：本次被抑制；仅当窗口内出现过调用时，在窗口末尾补执行最后一次
      if (!pending && trailing) {
        pending = true
        clearTimer()
        const remain = waitMs - (now - lastInvokeAt)
        timer = setTimeout(() => {
          timer = null
          if (pending) invoke()
        }, remain)
      }
    })
  }

  run.cancel = () => {
    clearTimer()
    pending = false
    lastArgs = null
    const rs = resolvers
    const rjs = rejecters
    resolvers = []
    rejecters = []
    rs.forEach((r) => r(undefined as unknown as R))
  }

  run.flush = () => {
    if (!pending) return Promise.resolve(undefined as unknown as R)
    return new Promise<R>((resolve, reject) => {
      resolvers.push(resolve)
      rejecters.push(reject)
      invoke()
    })
  }

  run.pending = () => pending

  return run
}

/**
 * 兼容旧 API：trailing 防抖（quiet 满 waitMs 后执行最后一次）。
 * 等价于 debounce(fn, waitMs)，新代码请直接使用 debounce / throttle。
 */
export interface DebouncedFn {
  (): Promise<unknown>
  cancel: () => void
  flush: () => Promise<unknown>
  pending: () => boolean
}

export function createDebounced(fn: () => void, waitMs: number): DebouncedFn {
  return debounce(fn, waitMs)
}
