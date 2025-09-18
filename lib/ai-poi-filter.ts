import type { POI, WeatherData, RouteInput } from "./types"
import { weatherService } from "./weather-service"

export interface AIFilteringCriteria {
  userPreferences: string[]
  weatherConditions: WeatherData
  timeOfDay: "morning" | "afternoon" | "evening" | "night"
  seasonality: "spring" | "summer" | "fall" | "winter"
  travelStyle: "adventure" | "relaxed" | "cultural" | "family" | "business"
}

export interface ScoredPOI extends POI {
  aiScore: number
  scoreBreakdown: {
    weatherSuitability: number
    preferenceMatch: number
    timeRelevance: number
    seasonalRelevance: number
    popularityScore: number
    accessibilityScore: number
  }
  aiRecommendationReason: string
}

export class AIPOIFilter {
  /**
   * Main AI filtering method that scores and ranks POIs
   */
  async filterAndRankPOIs(pois: POI[], routeInput: RouteInput, currentTime: Date = new Date()): Promise<ScoredPOI[]> {
    console.log("[v0] AI filtering", pois.length, "POIs")

    const criteria = this.buildFilteringCriteria(routeInput, currentTime)
    console.log("[v0] AI filtering criteria:", criteria)

    // Score each POI using AI-like algorithms
    const scoredPOIs: ScoredPOI[] = []

    for (const poi of pois) {
      const scoredPOI = await this.scorePOI(poi, criteria)
      scoredPOIs.push(scoredPOI)
    }

    // Sort by AI score (highest first)
    scoredPOIs.sort((a, b) => b.aiScore - a.aiScore)

    // Apply diversity filtering to ensure variety
    const diversePOIs = this.applyDiversityFiltering(scoredPOIs)

    console.log("[v0] AI filtering complete. Top POI:", diversePOIs[0]?.name, "Score:", diversePOIs[0]?.aiScore)

    return diversePOIs
  }

  /**
   * Build filtering criteria from route input and context
   */
  private buildFilteringCriteria(routeInput: RouteInput, currentTime: Date): AIFilteringCriteria {
    const hour = currentTime.getHours()
    const month = currentTime.getMonth()

    // Determine time of day
    let timeOfDay: AIFilteringCriteria["timeOfDay"]
    if (hour >= 6 && hour < 12) timeOfDay = "morning"
    else if (hour >= 12 && hour < 17) timeOfDay = "afternoon"
    else if (hour >= 17 && hour < 22) timeOfDay = "evening"
    else timeOfDay = "night"

    // Determine season
    let seasonality: AIFilteringCriteria["seasonality"]
    if (month >= 2 && month <= 4) seasonality = "spring"
    else if (month >= 5 && month <= 7) seasonality = "summer"
    else if (month >= 8 && month <= 10) seasonality = "fall"
    else seasonality = "winter"

    // Infer travel style from preferences
    const travelStyle = this.inferTravelStyle(routeInput.preferences)

    return {
      userPreferences: routeInput.preferences,
      weatherConditions: routeInput.weather || this.getDefaultWeather(),
      timeOfDay,
      seasonality,
      travelStyle,
    }
  }

  /**
   * Score individual POI using multiple AI factors
   */
  private async scorePOI(poi: POI, criteria: AIFilteringCriteria): Promise<ScoredPOI> {
    // Calculate individual score components
    const weatherSuitability = this.calculateWeatherSuitability(poi, criteria.weatherConditions)
    const preferenceMatch = this.calculatePreferenceMatch(poi, criteria.userPreferences)
    const timeRelevance = this.calculateTimeRelevance(poi, criteria.timeOfDay)
    const seasonalRelevance = this.calculateSeasonalRelevance(poi, criteria.seasonality)
    const popularityScore = this.calculatePopularityScore(poi)
    const accessibilityScore = this.calculateAccessibilityScore(poi)

    // Weighted combination of scores
    const weights = {
      weatherSuitability: 0.25,
      preferenceMatch: 0.3,
      timeRelevance: 0.15,
      seasonalRelevance: 0.1,
      popularityScore: 0.15,
      accessibilityScore: 0.05,
    }

    const aiScore =
      weatherSuitability * weights.weatherSuitability +
      preferenceMatch * weights.preferenceMatch +
      timeRelevance * weights.timeRelevance +
      seasonalRelevance * weights.seasonalRelevance +
      popularityScore * weights.popularityScore +
      accessibilityScore * weights.accessibilityScore

    // Generate AI recommendation reason
    const aiRecommendationReason = this.generateRecommendationReason(
      poi,
      {
        weatherSuitability,
        preferenceMatch,
        timeRelevance,
        seasonalRelevance,
        popularityScore,
        accessibilityScore,
      },
      criteria,
    )

    return {
      ...poi,
      aiScore: Math.round(aiScore * 100) / 100,
      scoreBreakdown: {
        weatherSuitability,
        preferenceMatch,
        timeRelevance,
        seasonalRelevance,
        popularityScore,
        accessibilityScore,
      },
      aiRecommendationReason,
    }
  }

  /**
   * Calculate weather suitability score (0-1)
   */
  private calculateWeatherSuitability(poi: POI, weather: WeatherData): number {
    if (!poi.weather) return 0.7 // Default score if no weather data

    const baseWeatherScore = weatherService.getWeatherSuitabilityScore(weather)

    // Adjust based on POI category
    const categoryWeatherSensitivity = {
      Parks: 1.0, // Very weather sensitive
      "Outdoor Activities": 1.0,
      "Scenic Views": 0.9,
      "Local Markets": 0.8,
      Shopping: 0.3, // Less weather sensitive
      Museums: 0.2,
      Restaurants: 0.4,
      Entertainment: 0.3,
      "Historic Sites": 0.6,
      "Art Galleries": 0.2,
      "Coffee Shops": 0.3,
      Nightlife: 0.1,
    }

    const sensitivity = categoryWeatherSensitivity[poi.category as keyof typeof categoryWeatherSensitivity] || 0.5

    // For weather-sensitive activities, bad weather significantly reduces score
    // For indoor activities, weather has minimal impact
    return sensitivity * baseWeatherScore + (1 - sensitivity) * 0.8
  }

  /**
   * Calculate preference match score (0-1)
   */
  private calculatePreferenceMatch(poi: POI, preferences: string[]): number {
    if (preferences.length === 0) return 0.6 // Neutral score if no preferences

    let matchScore = 0
    let maxPossibleScore = 0

    for (const preference of preferences) {
      maxPossibleScore += 1

      // Direct category match
      if (poi.category.toLowerCase().includes(preference.toLowerCase())) {
        matchScore += 1
        continue
      }

      // Semantic matching
      const semanticScore = this.calculateSemanticMatch(poi, preference)
      matchScore += semanticScore
    }

    return maxPossibleScore > 0 ? Math.min(1, matchScore / maxPossibleScore) : 0.6
  }

  /**
   * Calculate semantic similarity between POI and preference
   */
  private calculateSemanticMatch(poi: POI, preference: string): number {
    const semanticMappings = {
      food: ["Restaurants", "Coffee Shops", "Local Markets"],
      culture: ["Museums", "Art Galleries", "Historic Sites"],
      nature: ["Parks", "Scenic Views", "Outdoor Activities"],
      shopping: ["Shopping", "Local Markets"],
      entertainment: ["Entertainment", "Nightlife"],
      history: ["Historic Sites", "Museums"],
      art: ["Art Galleries", "Museums"],
      outdoor: ["Parks", "Outdoor Activities", "Scenic Views"],
      dining: ["Restaurants", "Coffee Shops"],
      nightlife: ["Nightlife", "Entertainment"],
      family: ["Parks", "Museums", "Entertainment"],
      adventure: ["Outdoor Activities", "Scenic Views"],
      relaxation: ["Parks", "Coffee Shops", "Scenic Views"],
    }

    const lowerPreference = preference.toLowerCase()

    for (const [concept, categories] of Object.entries(semanticMappings)) {
      if (lowerPreference.includes(concept) || concept.includes(lowerPreference)) {
        if (categories.includes(poi.category)) {
          return 0.7 // Partial semantic match
        }
      }
    }

    // Check if preference appears in POI name or description
    const searchText = `${poi.name} ${poi.description}`.toLowerCase()
    if (searchText.includes(lowerPreference)) {
      return 0.5
    }

    return 0
  }

  /**
   * Calculate time relevance score (0-1)
   */
  private calculateTimeRelevance(poi: POI, timeOfDay: AIFilteringCriteria["timeOfDay"]): number {
    const timePreferences = {
      morning: {
        "Coffee Shops": 1.0,
        Parks: 0.9,
        Museums: 0.8,
        "Historic Sites": 0.8,
        Restaurants: 0.6,
        Shopping: 0.7,
        Nightlife: 0.1,
      },
      afternoon: {
        Restaurants: 1.0,
        Shopping: 0.9,
        Museums: 0.9,
        Parks: 0.8,
        "Art Galleries": 0.9,
        "Local Markets": 0.8,
        "Coffee Shops": 0.7,
        Nightlife: 0.2,
      },
      evening: {
        Restaurants: 1.0,
        Entertainment: 0.9,
        Nightlife: 0.8,
        "Scenic Views": 0.7,
        "Coffee Shops": 0.6,
        Shopping: 0.4,
        Museums: 0.3,
      },
      night: {
        Nightlife: 1.0,
        Entertainment: 0.8,
        Restaurants: 0.6,
        "Coffee Shops": 0.3,
        Museums: 0.1,
        Parks: 0.2,
        Shopping: 0.1,
      },
    }

    const categoryScore = timePreferences[timeOfDay][poi.category as keyof (typeof timePreferences)[typeof timeOfDay]]
    return categoryScore || 0.5 // Default score if category not found
  }

  /**
   * Calculate seasonal relevance score (0-1)
   */
  private calculateSeasonalRelevance(poi: POI, season: AIFilteringCriteria["seasonality"]): number {
    const seasonalPreferences = {
      spring: {
        Parks: 1.0,
        "Outdoor Activities": 0.9,
        "Scenic Views": 0.9,
        "Local Markets": 0.8,
        Museums: 0.7,
        Restaurants: 0.8,
      },
      summer: {
        Parks: 1.0,
        "Outdoor Activities": 1.0,
        "Scenic Views": 1.0,
        "Local Markets": 0.9,
        Entertainment: 0.8,
        Restaurants: 0.9,
      },
      fall: {
        "Scenic Views": 1.0,
        Parks: 0.9,
        Museums: 0.9,
        "Art Galleries": 0.9,
        "Historic Sites": 0.8,
        "Coffee Shops": 0.8,
      },
      winter: {
        Museums: 1.0,
        "Art Galleries": 1.0,
        Shopping: 0.9,
        Restaurants: 0.9,
        Entertainment: 0.8,
        "Coffee Shops": 0.9,
        Parks: 0.4,
        "Outdoor Activities": 0.3,
      },
    }

    const categoryScore = seasonalPreferences[season][poi.category as keyof (typeof seasonalPreferences)[typeof season]]
    return categoryScore || 0.7 // Default score if category not found
  }

  /**
   * Calculate popularity score based on rating and other factors (0-1)
   */
  private calculatePopularityScore(poi: POI): number {
    let score = 0

    // Rating contribution (0.6 weight)
    if (poi.rating) {
      score += (poi.rating / 5.0) * 0.6
    } else {
      score += 0.3 // Default for missing rating
    }

    // Price level contribution (0.2 weight) - mid-range gets higher score
    if (poi.priceLevel) {
      const priceScore = poi.priceLevel === 2 || poi.priceLevel === 3 ? 1.0 : 0.7
      score += priceScore * 0.2
    } else {
      score += 0.14 // Default
    }

    // Additional factors (0.2 weight)
    let bonusScore = 0
    if (poi.website) bonusScore += 0.3
    if (poi.phone) bonusScore += 0.3
    if (poi.photos && poi.photos.length > 1) bonusScore += 0.2
    if (poi.openingHours && poi.openingHours.length > 0) bonusScore += 0.2

    score += Math.min(1.0, bonusScore) * 0.2

    return Math.min(1.0, score)
  }

  /**
   * Calculate accessibility score (0-1)
   */
  private calculateAccessibilityScore(poi: POI): number {
    let score = 0.7 // Base accessibility score

    // Distance from route penalty
    if (poi.distanceFromRoute) {
      const distancePenalty = Math.min(0.3, poi.distanceFromRoute / 10) // Max 30% penalty for 10km+ detour
      score -= distancePenalty
    }

    // Bonus for having contact information
    if (poi.phone) score += 0.1
    if (poi.website) score += 0.1
    if (poi.openingHours && poi.openingHours.length > 0) score += 0.1

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Generate human-readable recommendation reason
   */
  private generateRecommendationReason(
    poi: POI,
    scores: ScoredPOI["scoreBreakdown"],
    criteria: AIFilteringCriteria,
  ): string {
    const reasons: string[] = []

    // Weather-based reasons
    if (scores.weatherSuitability > 0.8) {
      reasons.push(`perfect weather conditions for ${poi.category.toLowerCase()}`)
    } else if (scores.weatherSuitability < 0.4) {
      reasons.push(`indoor alternative due to ${criteria.weatherConditions.condition.toLowerCase()}`)
    }

    // Preference-based reasons
    if (scores.preferenceMatch > 0.8) {
      reasons.push(`matches your interest in ${criteria.userPreferences.join(" and ").toLowerCase()}`)
    }

    // Time-based reasons
    if (scores.timeRelevance > 0.8) {
      reasons.push(`ideal for ${criteria.timeOfDay} visits`)
    }

    // Popularity-based reasons
    if (scores.popularityScore > 0.8 && poi.rating && poi.rating >= 4.5) {
      reasons.push(`highly rated (${poi.rating}/5.0) local favorite`)
    }

    // Seasonal reasons
    if (scores.seasonalRelevance > 0.8) {
      reasons.push(`especially beautiful during ${criteria.seasonality}`)
    }

    // Default reason if no specific reasons found
    if (reasons.length === 0) {
      reasons.push(`interesting ${poi.category.toLowerCase()} along your route`)
    }

    // Combine reasons into a natural sentence
    if (reasons.length === 1) {
      return `Recommended for ${reasons[0]}.`
    } else if (reasons.length === 2) {
      return `Recommended for ${reasons[0]} and ${reasons[1]}.`
    } else {
      const lastReason = reasons.pop()
      return `Recommended for ${reasons.join(", ")}, and ${lastReason}.`
    }
  }

  /**
   * Apply diversity filtering to ensure variety in recommendations
   */
  private applyDiversityFiltering(scoredPOIs: ScoredPOI[]): ScoredPOI[] {
    const diversePOIs: ScoredPOI[] = []
    const categoryCount: Record<string, number> = {}
    const maxPerCategory = 3

    for (const poi of scoredPOIs) {
      const currentCount = categoryCount[poi.category] || 0

      if (currentCount < maxPerCategory) {
        diversePOIs.push(poi)
        categoryCount[poi.category] = currentCount + 1
      }

      // Stop when we have enough diverse POIs
      if (diversePOIs.length >= 15) break
    }

    return diversePOIs
  }

  /**
   * Infer travel style from user preferences
   */
  private inferTravelStyle(preferences: string[]): AIFilteringCriteria["travelStyle"] {
    const styleKeywords = {
      adventure: ["outdoor", "hiking", "adventure", "sports", "nature"],
      cultural: ["museum", "art", "history", "culture", "heritage"],
      relaxed: ["coffee", "park", "scenic", "garden", "spa"],
      family: ["family", "kids", "children", "playground", "zoo"],
      business: ["business", "conference", "meeting", "hotel"],
    }

    const lowerPrefs = preferences.map((p) => p.toLowerCase())

    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some((keyword) => lowerPrefs.some((pref) => pref.includes(keyword)))) {
        return style as AIFilteringCriteria["travelStyle"]
      }
    }

    return "relaxed" // Default travel style
  }

  /**
   * Get default weather data for fallback
   */
  private getDefaultWeather(): WeatherData {
    return {
      temperature: 20,
      condition: "Clear",
      humidity: 50,
      windSpeed: 10,
      icon: "☀️",
    }
  }
}

export const aiPOIFilter = new AIPOIFilter()
