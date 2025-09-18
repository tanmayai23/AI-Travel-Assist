import type { POI, Location } from "./types"
import { database } from "./database"

export class POIService {
  private static readonly SEARCH_RADIUS_KM = 10
  private static readonly MAX_RESULTS = 20
  private static readonly SERP_API_KEY = "6407a1ed8296fd650ef0fc4079d73482cb13d5c586edd78f2a72746bca554cfe"

  /**
   * Search for POIs near a location using multiple strategies
   */
  async searchPOIsNearLocation(
    location: Location,
    categories: string[] = [],
    radius: number = POIService.SEARCH_RADIUS_KM,
  ): Promise<POI[]> {
    console.log("[v0] Searching POIs near:", location, "categories:", categories)

    // Try multiple POI sources
    const allPOIs: POI[] = []

    try {
      const serpPOIs = await this.searchSerpAPI(location, categories, radius)
      allPOIs.push(...serpPOIs)
      console.log("[v0] Found SerpApi POIs:", serpPOIs.length)
    } catch (error) {
      console.warn("[v0] SerpApi search failed:", error)
    }

    // 1. Try OpenStreetMap Overpass API (free)
    try {
      const osmPOIs = await this.searchOverpassAPI(location, categories, radius)
      allPOIs.push(...osmPOIs)
      console.log("[v0] Found OSM POIs:", osmPOIs.length)
    } catch (error) {
      console.warn("[v0] OSM search failed:", error)
    }

    // 2. Try Foursquare Places API (has free tier)
    try {
      const foursquarePOIs = await this.searchFoursquareAPI(location, categories, radius)
      allPOIs.push(...foursquarePOIs)
      console.log("[v0] Found Foursquare POIs:", foursquarePOIs.length)
    } catch (error) {
      console.warn("[v0] Foursquare search failed:", error)
    }

    // 3. Fallback to enhanced mock data if no real results
    if (allPOIs.length === 0) {
      console.log("[v0] Using enhanced mock POI data")
      const mockPOIs = this.generateEnhancedMockPOIs(location, categories)
      allPOIs.push(...mockPOIs)
    }

    // Remove duplicates and limit results
    const uniquePOIs = this.removeDuplicatePOIs(allPOIs)
    return uniquePOIs.slice(0, POIService.MAX_RESULTS)
  }

  /**
   * Search using SerpApi Google Places
   */
  private async searchSerpAPI(location: Location, categories: string[], radius: number): Promise<POI[]> {
    const query = this.buildSerpQuery(categories)

    const params = new URLSearchParams({
      engine: "google_maps",
      q: query,
      ll: `@${location.lat},${location.lng},14z`, // Fixed format: @lat,lng,zoom
      type: "search",
      api_key: POIService.SERP_API_KEY,
    })

    console.log("[v0] SerpApi request:", `https://serpapi.com/search?${params.toString()}`)

    const response = await fetch(`https://serpapi.com/search?${params.toString()}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] SerpApi error response:", errorText)
      throw new Error(`SerpApi error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("[v0] SerpApi response status:", data.search_metadata?.status)

    if (data.error) {
      console.log("[v0] SerpApi returned error:", data.error)
      throw new Error(`SerpApi error: ${data.error}`)
    }

    return this.parseSerpResponse(data)
  }

  /**
   * Build search query for SerpApi based on categories
   */
  private buildSerpQuery(categories: string[]): string {
    if (categories.length === 0) {
      return "restaurants museums parks attractions near me"
    }

    const queryMap: Record<string, string> = {
      Restaurants: "restaurants cafes food",
      Museums: "museums galleries cultural sites",
      Parks: "parks gardens outdoor spaces",
      Shopping: "shopping malls stores markets",
      "Historic Sites": "historic sites monuments landmarks",
      Entertainment: "entertainment theaters cinemas venues",
      "Outdoor Activities": "outdoor activities recreation sports",
      "Art Galleries": "art galleries exhibitions",
      "Local Markets": "local markets farmers markets",
      "Scenic Views": "scenic viewpoints lookouts",
      "Coffee Shops": "coffee shops cafes",
      Nightlife: "bars nightlife clubs",
    }

    const searchTerms = categories.map((cat) => queryMap[cat] || cat.toLowerCase()).join(" ")
    return `${searchTerms} near me`
  }

  /**
   * Parse SerpApi response into POI objects
   */
  private parseSerpResponse(data: any): POI[] {
    const pois: POI[] = []

    if (!data.local_results || data.local_results.length === 0) {
      console.log("[v0] No local_results in SerpApi response")
      return pois
    }

    console.log("[v0] SerpApi returned", data.local_results.length, "results")

    data.local_results.forEach((result: any) => {
      if (!result.title || !result.gps_coordinates) return

      const poi: POI = {
        id: `serp_${result.place_id || database.generateId()}`,
        name: result.title,
        description: result.description || this.generateDescriptionFromType(result.type),
        category: this.mapSerpTypeToCategory(result.type),
        location: {
          lat: result.gps_coordinates.latitude,
          lng: result.gps_coordinates.longitude,
          address: result.address || "Address not available",
        },
        rating: result.rating || this.generateRandomRating(),
        priceLevel: this.mapSerpPriceLevel(result.price),
        photos: result.thumbnail
          ? [result.thumbnail]
          : [`/placeholder.svg?height=200&width=300&query=${encodeURIComponent(result.title)}`],
        openingHours: result.hours ? [result.hours] : [],
        website: result.website,
        phone: result.phone,
        aiScore: 0, // Will be calculated later
        distanceFromRoute: 0, // Will be calculated later
      }

      pois.push(poi)
    })

    console.log("[v0] Parsed SerpApi POIs:", pois.length)
    return pois
  }

  /**
   * Map SerpApi business type to our categories
   */
  private mapSerpTypeToCategory(type: string): string {
    if (!type) return "Other"

    const typeMap: Record<string, string> = {
      restaurant: "Restaurants",
      food: "Restaurants",
      cafe: "Restaurants",
      museum: "Museums",
      gallery: "Art Galleries",
      park: "Parks",
      shopping: "Shopping",
      store: "Shopping",
      historic: "Historic Sites",
      monument: "Historic Sites",
      entertainment: "Entertainment",
      theater: "Entertainment",
      cinema: "Entertainment",
    }

    const lowerType = type.toLowerCase()
    for (const [key, category] of Object.entries(typeMap)) {
      if (lowerType.includes(key)) {
        return category
      }
    }

    return "Other"
  }

  /**
   * Map SerpApi price level to our 1-4 scale
   */
  private mapSerpPriceLevel(price: string): number {
    if (!price) return 2

    if (price.includes("$$$$$")) return 4
    if (price.includes("$$$$")) return 4
    if (price.includes("$$$")) return 3
    if (price.includes("$$")) return 2
    if (price.includes("$")) return 1

    return 2
  }

  /**
   * Generate description from business type
   */
  private generateDescriptionFromType(type: string): string {
    const descriptions: Record<string, string> = {
      restaurant: "A popular dining establishment offering delicious meals.",
      cafe: "A cozy spot perfect for coffee and light meals.",
      museum: "Explore fascinating exhibits and learn about local culture.",
      park: "Beautiful outdoor space perfect for relaxation and activities.",
      shopping: "Great place to find unique items and local products.",
      historic: "Discover the rich history and heritage of this area.",
      entertainment: "Popular venue for entertainment and cultural experiences.",
    }

    if (!type) return "An interesting local attraction worth visiting."

    const lowerType = type.toLowerCase()
    for (const [key, desc] of Object.entries(descriptions)) {
      if (lowerType.includes(key)) {
        return desc
      }
    }

    return "A notable local business or attraction."
  }

  /**
   * Generate random rating for places without ratings
   */
  private generateRandomRating(): number {
    return Math.round((Math.random() * 2 + 3) * 10) / 10 // 3.0-5.0
  }

  /**
   * Search using OpenStreetMap Overpass API (free)
   */
  private async searchOverpassAPI(location: Location, categories: string[], radius: number): Promise<POI[]> {
    const overpassQuery = this.buildOverpassQuery(location, categories, radius)

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`)
    }

    const data = await response.json()
    return this.parseOverpassResponse(data)
  }

  /**
   * Build Overpass API query for POI search
   */
  private buildOverpassQuery(location: Location, categories: string[], radius: number): string {
    const radiusMeters = radius * 1000

    // Map categories to OSM tags
    const osmTags = this.mapCategoriesToOSMTags(categories)

    let query = `[out:json][timeout:25];(`

    // Add queries for each tag type
    osmTags.forEach((tag) => {
      query += `node["${tag.key}"="${tag.value}"](around:${radiusMeters},${location.lat},${location.lng});`
      query += `way["${tag.key}"="${tag.value}"](around:${radiusMeters},${location.lat},${location.lng});`
    })

    // If no specific categories, search for common POI types
    if (osmTags.length === 0) {
      const commonTags = [
        'node["tourism"](around:' + radiusMeters + "," + location.lat + "," + location.lng + ");",
        'node["amenity"~"restaurant|cafe|museum|theatre"](around:' +
          radiusMeters +
          "," +
          location.lat +
          "," +
          location.lng +
          ");",
        'way["tourism"](around:' + radiusMeters + "," + location.lat + "," + location.lng + ");",
        'way["amenity"~"restaurant|cafe|museum|theatre"](around:' +
          radiusMeters +
          "," +
          location.lat +
          "," +
          location.lng +
          ");",
      ]
      query += commonTags.join("")
    }

    query += `);out center meta;`

    return query
  }

  /**
   * Map user categories to OpenStreetMap tags
   */
  private mapCategoriesToOSMTags(categories: string[]): Array<{ key: string; value: string }> {
    const categoryMap: Record<string, Array<{ key: string; value: string }>> = {
      Restaurants: [
        { key: "amenity", value: "restaurant" },
        { key: "amenity", value: "fast_food" },
        { key: "amenity", value: "cafe" },
      ],
      Museums: [
        { key: "tourism", value: "museum" },
        { key: "amenity", value: "arts_centre" },
      ],
      Parks: [
        { key: "leisure", value: "park" },
        { key: "leisure", value: "garden" },
      ],
      Shopping: [
        { key: "shop", value: "*" },
        { key: "amenity", value: "marketplace" },
      ],
      "Historic Sites": [
        { key: "historic", value: "*" },
        { key: "tourism", value: "attraction" },
      ],
      Entertainment: [
        { key: "amenity", value: "theatre" },
        { key: "amenity", value: "cinema" },
        { key: "leisure", value: "amusement_arcade" },
      ],
    }

    const tags: Array<{ key: string; value: string }> = []
    categories.forEach((category) => {
      const mappedTags = categoryMap[category]
      if (mappedTags) {
        tags.push(...mappedTags)
      }
    })

    return tags
  }

  /**
   * Parse Overpass API response into POI objects
   */
  private parseOverpassResponse(data: any): POI[] {
    const pois: POI[] = []

    data.elements?.forEach((element: any) => {
      if (!element.tags?.name) return

      const lat = element.lat || element.center?.lat
      const lon = element.lon || element.center?.lon

      if (!lat || !lon) return

      const poi: POI = {
        id: `osm_${element.type}_${element.id}`,
        name: element.tags.name,
        description: this.generateDescriptionFromTags(element.tags),
        category: this.mapOSMTagsToCategory(element.tags),
        location: {
          lat,
          lng: lon,
          address: this.buildAddressFromTags(element.tags),
        },
        rating: this.estimateRatingFromTags(element.tags),
        priceLevel: this.estimatePriceLevelFromTags(element.tags),
        photos: [`/placeholder.svg?height=200&width=300&query=${encodeURIComponent(element.tags.name)}`],
        openingHours: element.tags.opening_hours ? [element.tags.opening_hours] : [],
        website: element.tags.website,
        phone: element.tags.phone,
        aiScore: 0, // Will be calculated later
        distanceFromRoute: 0, // Will be calculated later
      }

      pois.push(poi)
    })

    return pois
  }

  /**
   * Search using Foursquare Places API (mock implementation)
   */
  private async searchFoursquareAPI(location: Location, categories: string[], radius: number): Promise<POI[]> {
    // Mock Foursquare API call - in real implementation, you'd use actual API
    // This would require FOURSQUARE_API_KEY environment variable

    console.log("[v0] Foursquare API not implemented, using mock data")
    return []
  }

  /**
   * Generate enhanced mock POIs with more realistic data
   */
  private generateEnhancedMockPOIs(location: Location, categories: string[]): POI[] {
    const mockPOIs: POI[] = []
    const targetCategories =
      categories.length > 0
        ? categories
        : ["Restaurants", "Museums", "Parks", "Shopping", "Historic Sites", "Entertainment"]

    targetCategories.forEach((category) => {
      const poisInCategory = Math.floor(Math.random() * 4) + 2 // 2-5 POIs per category

      for (let i = 0; i < poisInCategory; i++) {
        const poi: POI = {
          id: database.generateId(),
          name: this.generateRealisticPOIName(category),
          description: this.generateRealisticDescription(category),
          category,
          location: {
            lat: location.lat + (Math.random() - 0.5) * 0.02,
            lng: location.lng + (Math.random() - 0.5) * 0.02,
            address: this.generateRealisticAddress(),
          },
          rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0
          priceLevel: this.generateRealisticPriceLevel(category),
          photos: [
            `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(category + " interior")}`,
            `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(category + " exterior")}`,
          ],
          openingHours: this.generateRealisticOpeningHours(category),
          website: `https://example.com/${database.generateId()}`,
          phone: this.generateRealisticPhoneNumber(),
          aiScore: Math.random(),
          distanceFromRoute: Math.random() * 5, // 0-5km from route
        }

        mockPOIs.push(poi)
      }
    })

    return mockPOIs
  }

  // Helper methods for parsing and generating realistic data
  private generateDescriptionFromTags(tags: any): string {
    if (tags.description) return tags.description

    const category = this.mapOSMTagsToCategory(tags)
    return this.generateRealisticDescription(category)
  }

  private mapOSMTagsToCategory(tags: any): string {
    if (tags.amenity === "restaurant" || tags.amenity === "cafe" || tags.amenity === "fast_food") return "Restaurants"
    if (tags.tourism === "museum" || tags.amenity === "arts_centre") return "Museums"
    if (tags.leisure === "park" || tags.leisure === "garden") return "Parks"
    if (tags.shop) return "Shopping"
    if (tags.historic || tags.tourism === "attraction") return "Historic Sites"
    if (tags.amenity === "theatre" || tags.amenity === "cinema") return "Entertainment"

    return "Other"
  }

  private buildAddressFromTags(tags: any): string {
    const parts = []
    if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"])
    if (tags["addr:street"]) parts.push(tags["addr:street"])
    if (tags["addr:city"]) parts.push(tags["addr:city"])

    return parts.length > 0 ? parts.join(" ") : "Address not available"
  }

  private estimateRatingFromTags(tags: any): number {
    // Estimate rating based on available information
    let rating = 3.5 // Base rating

    if (tags.website) rating += 0.3
    if (tags.phone) rating += 0.2
    if (tags.opening_hours) rating += 0.2
    if (tags.wheelchair === "yes") rating += 0.3

    return Math.min(5.0, Math.round(rating * 10) / 10)
  }

  private estimatePriceLevelFromTags(tags: any): number {
    // Estimate price level (1-4) based on tags
    if (tags.amenity === "fast_food") return 1
    if (tags.amenity === "cafe") return 2
    if (tags.amenity === "restaurant") return 3
    if (tags.tourism === "museum") return 2

    return Math.floor(Math.random() * 3) + 2 // 2-4 for most places
  }

  private generateRealisticPOIName(category: string): string {
    const names = {
      Restaurants: ["The Garden Bistro", "Mama's Kitchen", "Riverside Grill", "Urban Spoon", "The Local Table"],
      Museums: ["Heritage Museum", "Art & Culture Center", "History House", "Discovery Museum", "Cultural Gallery"],
      Parks: ["Central Park", "Riverside Gardens", "Memorial Park", "Nature Reserve", "Community Green"],
      Shopping: ["Main Street Market", "Artisan Quarter", "The Shopping District", "Local Bazaar", "Craft Corner"],
      "Historic Sites": ["Old Town Hall", "Heritage Building", "Historic Church", "Monument Square", "Ancient Ruins"],
      Entertainment: ["The Grand Theater", "Cinema Complex", "Live Music Venue", "Comedy Club", "Arts Center"],
    }

    const categoryNames = names[category as keyof typeof names] || ["Local Attraction"]
    return categoryNames[Math.floor(Math.random() * categoryNames.length)]
  }

  private generateRealisticDescription(category: string): string {
    const descriptions = {
      Restaurants: "A beloved local dining spot known for fresh ingredients and authentic flavors.",
      Museums: "Explore fascinating exhibits showcasing local history and culture.",
      Parks: "Beautiful green space perfect for relaxation and outdoor activities.",
      Shopping: "Discover unique local products and handcrafted items.",
      "Historic Sites": "Step back in time and explore the rich heritage of this area.",
      Entertainment: "Popular venue offering great entertainment and cultural experiences.",
    }

    return descriptions[category as keyof typeof descriptions] || "An interesting local attraction worth visiting."
  }

  private generateRealisticAddress(): string {
    const streetNumbers = Math.floor(Math.random() * 999) + 1
    const streetNames = ["Main St", "Oak Ave", "Park Rd", "First St", "Market St", "Church St", "Mill Rd"]
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)]

    return `${streetNumbers} ${streetName}`
  }

  private generateRealisticPriceLevel(category: string): number {
    const priceLevels = {
      Restaurants: [2, 3, 4],
      Museums: [1, 2],
      Parks: [1],
      Shopping: [2, 3, 4],
      "Historic Sites": [1, 2],
      Entertainment: [2, 3],
    }

    const levels = priceLevels[category as keyof typeof priceLevels] || [2, 3]
    return levels[Math.floor(Math.random() * levels.length)]
  }

  private generateRealisticOpeningHours(category: string): string[] {
    const schedules = {
      Restaurants: ["Mon-Thu: 11:00 AM - 10:00 PM", "Fri-Sat: 11:00 AM - 11:00 PM", "Sun: 12:00 PM - 9:00 PM"],
      Museums: ["Tue-Sun: 10:00 AM - 5:00 PM", "Mon: Closed"],
      Parks: ["Daily: 6:00 AM - 10:00 PM"],
      Shopping: ["Mon-Sat: 10:00 AM - 8:00 PM", "Sun: 12:00 PM - 6:00 PM"],
      "Historic Sites": ["Daily: 9:00 AM - 5:00 PM"],
      Entertainment: ["Shows: 7:00 PM - 11:00 PM", "Box Office: 12:00 PM - 8:00 PM"],
    }

    return schedules[category as keyof typeof schedules] || ["Daily: 9:00 AM - 6:00 PM"]
  }

  private generateRealisticPhoneNumber(): string {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
  }

  private removeDuplicatePOIs(pois: POI[]): POI[] {
    const seen = new Set<string>()
    return pois.filter((poi) => {
      const key = `${poi.name}_${poi.location.lat.toFixed(4)}_${poi.location.lng.toFixed(4)}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }
}

export const poiService = new POIService()
