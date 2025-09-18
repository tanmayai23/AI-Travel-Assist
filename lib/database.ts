import type { TripPlan, POI, UserPreferences, Location } from "./types"

interface DatabaseStore {
  trips: Map<string, TripPlan>
  userPreferences: Map<string, UserPreferences>
  poiCache: Map<string, POI[]>
}

class InMemoryDatabase {
  private store: DatabaseStore = {
    trips: new Map(),
    userPreferences: new Map(),
    poiCache: new Map(),
  }

  // Trip operations
  async saveTripPlan(trip: TripPlan): Promise<void> {
    this.store.trips.set(trip.id, trip)
  }

  async getTripPlan(id: string): Promise<TripPlan | null> {
    return this.store.trips.get(id) || null
  }

  async getAllTrips(): Promise<TripPlan[]> {
    return Array.from(this.store.trips.values())
  }

  async deleteTripPlan(id: string): Promise<void> {
    this.store.trips.delete(id)
  }

  // User preferences operations
  async saveUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    this.store.userPreferences.set(userId, preferences)
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    return this.store.userPreferences.get(userId) || null
  }

  // POI cache operations
  async cachePOIs(routeKey: string, pois: POI[]): Promise<void> {
    this.store.poiCache.set(routeKey, pois)
  }

  async getCachedPOIs(routeKey: string): Promise<POI[] | null> {
    return this.store.poiCache.get(routeKey) || null
  }

  // Utility methods
  generateRouteKey(from: Location, to: Location): string {
    return `${from.lat},${from.lng}-${to.lat},${to.lng}`
  }

  generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}

export const database = new InMemoryDatabase()
