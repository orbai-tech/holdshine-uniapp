type DebouncedFn = {
  (): void
  cancel: () => void
  flush: () => void
}

/** trailing 防抖：quiet 满 waitMs 后执行最后一次。 */
export function createDebounced(fn: () => void, waitMs: number): DebouncedFn {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending = false

  function run() {
    pending = true
    if (timer != null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      pending = false
      fn()
    }, waitMs)
  }

  run.cancel = () => {
    if (timer != null) clearTimeout(timer)
    timer = null
    pending = false
  }

  run.flush = () => {
    if (!pending) return
    run.cancel()
    fn()
  }

  return run
}
