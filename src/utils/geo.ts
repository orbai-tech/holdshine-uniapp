export interface GeoPoint {
  latitude: number
  longitude: number
}

const LOCATION_TYPE = 'gcj02'
const LOCATION_TTL_MS = 4000

let locationInflight: Promise<GeoPoint | null> | null = null
let locationCache: { at: number; point: GeoPoint | null } | null = null

export function parseCoord(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earth = 6371
  const dLat = toRad(to.latitude - from.latitude)
  const dLng = toRad(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function readCachedLocation(): GeoPoint | null | undefined {
  if (!locationCache) return undefined
  if (Date.now() - locationCache.at >= LOCATION_TTL_MS) return undefined
  return locationCache.point
}

function getLocationAuthState(): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    uni.getSetting({
      success(res) {
        const value = res.authSetting['scope.userLocation']
        if (value === true) {
          resolve(true)
          return
        }
        if (value === false) {
          resolve(false)
          return
        }
        resolve(undefined)
      },
      fail() {
        resolve(undefined)
      },
    })
  })
}

function requestLocationAuthorize(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.authorize({
      scope: 'scope.userLocation',
      success() {
        resolve(true)
      },
      fail() {
        resolve(false)
      },
    })
  })
}

function confirmOpenLocationSetting(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '需要位置权限',
      content: '开启定位后可按距离推荐门店',
      confirmText: '去开启',
      cancelText: '取消',
      success(res) {
        resolve(Boolean(res.confirm))
      },
      fail() {
        resolve(false)
      },
    })
  })
}

function openLocationSetting(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.openSetting({
      success(res) {
        resolve(res.authSetting['scope.userLocation'] === true)
      },
      fail() {
        resolve(false)
      },
    })
  })
}

/**
 * 未授权时弹出系统授权；曾拒绝则引导去设置开启。
 * 用户不同意返回 false，由调用方 toast「没有权限」。
 */
export async function ensureLocationPermission(): Promise<boolean> {
  const state = await getLocationAuthState()
  if (state === true) return true
  if (state !== false) return requestLocationAuthorize()
  const goSetting = await confirmOpenLocationSetting()
  if (!goSetting) return false
  return openLocationSetting()
}

/** 定位失败返回 null，由调用方改选列表第一家。 */
export async function getUserLocation(options?: { force?: boolean }): Promise<GeoPoint | null> {
  if (options?.force) {
    locationCache = null
  } else {
    const cached = readCachedLocation()
    if (cached !== undefined) return cached
  }
  if (locationInflight) return locationInflight

  locationInflight = readDeviceLocation()
    .then((point) => {
      locationCache = { at: Date.now(), point }
      return point
    })
    .finally(() => {
      locationInflight = null
    })
  return locationInflight
}

function readDeviceLocation(): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    uni.getLocation({
      type: LOCATION_TYPE,
      success(result) {
        resolve({ latitude: result.latitude, longitude: result.longitude })
      },
      fail() {
        resolve(null)
      },
    })
  })
}

export interface ChosenMapLocation {
  name: string
  address: string
  latitude: number
  longitude: number
}

function readWxErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  return String((error as UniApp.GeneralCallbackResult).errMsg || '')
}

function isUserCancelled(error: unknown): boolean {
  return /cancel/i.test(readWxErrorMessage(error))
}

/**
 * 先 getLocation（或沿用传入中心点），再 chooseLocation 打开地图选点。
 * 用户取消返回 null；定位失败仍会打开选点页（不带初始坐标）。
 */
export async function chooseMapLocation(
  center?: GeoPoint | null,
): Promise<ChosenMapLocation | null> {
  const point = center ?? (await readDeviceLocation())

  return new Promise((resolve) => {
    const options: UniApp.ChooseLocationOptions = {
      success(result) {
        resolve({
          name: result.name || '',
          address: result.address || '',
          latitude: result.latitude,
          longitude: result.longitude,
        })
      },
      fail(err) {
        if (isUserCancelled(err)) {
          resolve(null)
          return
        }
        console.error('[元气善筑] chooseLocation 失败', err)
        uni.showToast({ title: '无法打开地图选点', icon: 'none' })
        resolve(null)
      },
    }
    if (point) {
      options.latitude = point.latitude
      options.longitude = point.longitude
    }
    uni.chooseLocation(options)
  })
}
