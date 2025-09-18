export interface GeocodeResult {
  lat: number
  lng: number
  address: string
  placeId?: string
}

export class GeocodingService {
  private readonly NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"

  /**
   * Search for location suggestions based on user input using OpenStreetMap Nominatim
   */
  async searchLocations(query: string): Promise<GeocodeResult[]> {
    if (!query || query.length < 2) return []

    try {
      console.log("[v0] Searching locations for:", query)

      // Use OpenStreetMap Nominatim API for location search
      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=in,us,gb,ca,au`,
        {
          headers: {
            "User-Agent": "TravelDiscoveryApp/1.0",
          },
        },
      )

      if (!response.ok) {
        console.error("[v0] Nominatim API error:", response.status)
        return this.getFallbackResults(query)
      }

      const data = await response.json()
      console.log("[v0] Nominatim API response:", data.length, "results")

      const results: GeocodeResult[] = data.map((item: any) => ({
        lat: Number.parseFloat(item.lat),
        lng: Number.parseFloat(item.lon),
        address: item.display_name,
        placeId: item.place_id?.toString(),
      }))

      return results
    } catch (error) {
      console.error("[v0] Error searching locations:", error)
      return this.getFallbackResults(query)
    }
  }

  /**
   * Fallback results when API fails - comprehensive Indian and international locations
   */
  private getFallbackResults(query: string): GeocodeResult[] {
    const fallbackLocations = [
      { lat: 23.2599, lng: 77.4126, address: "Bhopal, Madhya Pradesh, India" },
      { lat: 22.4676, lng: 78.6677, address: "Pachmarhi, Madhya Pradesh, India" },
      { lat: 28.6139, lng: 77.209, address: "New Delhi, Delhi, India" },
      { lat: 19.076, lng: 72.8777, address: "Mumbai, Maharashtra, India" },
      { lat: 12.9716, lng: 77.5946, address: "Bangalore, Karnataka, India" },
      { lat: 13.0827, lng: 80.2707, address: "Chennai, Tamil Nadu, India" },
      { lat: 22.5726, lng: 88.3639, address: "Kolkata, West Bengal, India" },
      { lat: 18.5204, lng: 73.8567, address: "Pune, Maharashtra, India" },
      { lat: 26.9124, lng: 75.7873, address: "Jaipur, Rajasthan, India" },
      { lat: 17.385, lng: 78.4867, address: "Hyderabad, Telangana, India" },
      { lat: 40.7128, lng: -74.006, address: "New York, NY, USA" },
      { lat: 34.0522, lng: -118.2437, address: "Los Angeles, CA, USA" },
      { lat: 51.5074, lng: -0.1278, address: "London, UK" },
      { lat: 48.8566, lng: 2.3522, address: "Paris, France" },
      { lat: 35.6762, lng: 139.6503, address: "Tokyo, Japan" },
    ]

    const queryLower = query.toLowerCase()
    return fallbackLocations.filter((location) => location.address.toLowerCase().includes(queryLower)).slice(0, 5)
  }

  /**
   * Reverse geocode coordinates to address using Nominatim
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            "User-Agent": "TravelDiscoveryApp/1.0",
          },
        },
      )

      if (!response.ok) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }

      const data = await response.json()

      if (data?.display_name) {
        return data.display_name
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (error) {
      console.error("[v0] Error reverse geocoding:", error)
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }
}

export const geocodingService = new GeocodingService()
