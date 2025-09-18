import type { RouteInput, TripPlan, RouteCheckpoint, Location, POI } from "./types"
import { database } from "./database"
import { weatherService } from "./weather-service"
import { poiService } from "./poi-service"
import { aiPOIFilter } from "./ai-poi-filter"
import { DistanceCalculator } from "./distance-calculator"

export class RouteOrchestrator {
  private static readonly CHECKPOINT_INTERVAL_KM = 50 // Sample every 50km
  private static readonly MAX_DETOUR_KM = 10 // Maximum detour distance

  /**
   * Main orchestration method that processes a route and finds POIs
   */
  async processRoute(routeInput: RouteInput): Promise<TripPlan> {
    console.log("[v0] Starting route processing:", routeInput)

    // Generate unique trip ID
    const tripId = database.generateId()

    // Step 1: Generate route checkpoints
    const checkpoints = await this.generateRouteCheckpoints(routeInput)
    console.log("[v0] Generated checkpoints:", checkpoints.length)

    // Step 2: Find POIs near each checkpoint with weather data
    const allPOIs: POI[] = []
    for (const checkpoint of checkpoints) {
      console.log("[v0] Processing checkpoint:", checkpoint.location.address)

      // Get weather data for this checkpoint
      const weather = await weatherService.getWeatherData(checkpoint.location)
      console.log("[v0] Weather at checkpoint:", weather.condition, weather.temperature + "°C")

      // Find POIs near this checkpoint
      const poisNearCheckpoint = await poiService.searchPOIsNearLocation(checkpoint.location, routeInput.preferences)

      const poisWithWeatherAndDistance = poisNearCheckpoint.map((poi) => {
        const distanceInfo = DistanceCalculator.calculateDistanceToClosestPoint(
          poi.location.lat,
          poi.location.lng,
          routeInput.from.lat,
          routeInput.from.lng,
          routeInput.to.lat,
          routeInput.to.lng,
        )

        return {
          ...poi,
          weather: weather,
          distanceFromRoute: distanceInfo.distance,
          closestTo: distanceInfo.closestTo,
        }
      })

      allPOIs.push(...poisWithWeatherAndDistance)
    }

    console.log("[v0] Found total POIs with weather data:", allPOIs.length)

    // Step 3: Apply AI filtering and ranking
    const aiFilteredPOIs = await aiPOIFilter.filterAndRankPOIs(allPOIs, routeInput)
    console.log("[v0] AI filtered POIs:", aiFilteredPOIs.length, "top score:", aiFilteredPOIs[0]?.aiScore)

    // Step 4: Create trip plan with AI-ranked POIs
    const tripPlan: TripPlan = {
      id: tripId,
      route: routeInput,
      checkpoints,
      pois: aiFilteredPOIs,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Step 5: Save to database
    await database.saveTripPlan(tripPlan)

    console.log("[v0] Trip plan created and saved:", tripId)
    return tripPlan
  }

  /**
   * Generate checkpoints along the route for POI sampling
   */
  private async generateRouteCheckpoints(routeInput: RouteInput): Promise<RouteCheckpoint[]> {
    const { from, to, departureTime } = routeInput

    const departureDate = new Date(departureTime)

    // Calculate approximate distance (simplified great circle distance)
    const distance = this.calculateDistance(from, to)
    const numberOfCheckpoints = Math.max(2, Math.floor(distance / RouteOrchestrator.CHECKPOINT_INTERVAL_KM))

    const checkpoints: RouteCheckpoint[] = []

    for (let i = 0; i < numberOfCheckpoints; i++) {
      const progress = i / (numberOfCheckpoints - 1)

      // Linear interpolation between start and end points
      const lat = from.lat + (to.lat - from.lat) * progress
      const lng = from.lng + (to.lng - from.lng) * progress

      // Estimate time based on average speed (80 km/h)
      const estimatedTime = new Date(departureDate.getTime() + ((progress * distance) / 80) * 60 * 60 * 1000)

      checkpoints.push({
        location: {
          lat,
          lng,
          address: `Checkpoint ${i + 1}`,
        },
        distanceFromStart: progress * distance,
        estimatedTime,
      })
    }

    return checkpoints
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(from: Location, to: Location): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(to.lat - from.lat)
    const dLng = this.toRadians(to.lng - from.lng)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.lat)) * Math.cos(this.toRadians(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

export const routeOrchestrator = new RouteOrchestrator()
