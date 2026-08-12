export interface GeoPoint {
  latitude: number
  longitude: number
}

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

/** 定位失败返回 null，由调用方改选列表第一家。 */
export function getUserLocation(): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    uni.getLocation({
      type: 'gcj02',
      success(result) {
        resolve({ latitude: result.latitude, longitude: result.longitude })
      },
      fail() {
        resolve(null)
      },
    })
  })
}
