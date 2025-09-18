export class DistanceCalculator {
  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Calculate distance from POI to closest point (origin or destination)
   */
  static calculateDistanceToClosestPoint(
    poiLat: number,
    poiLng: number,
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): { distance: number; closestTo: "origin" | "destination" } {
    const distanceToOrigin = this.calculateDistance(poiLat, poiLng, originLat, originLng)
    const distanceToDestination = this.calculateDistance(poiLat, poiLng, destLat, destLng)

    if (distanceToOrigin <= distanceToDestination) {
      return { distance: distanceToOrigin, closestTo: "origin" }
    } else {
      return { distance: distanceToDestination, closestTo: "destination" }
    }
  }

  /**
   * Format distance for display
   */
  static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`
    } else {
      return `${Math.round(distanceKm)}km`
    }
  }
}
