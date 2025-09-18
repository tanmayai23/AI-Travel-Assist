import type { WeatherData, Location } from "./types"

export class WeatherService {
  private static readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
  private weatherCache = new Map<string, { data: WeatherData; timestamp: number }>()

  /**
   * Get weather data for a location using OpenWeatherMap-like free API
   */
  async getWeatherData(location: Location): Promise<WeatherData> {
    const cacheKey = `${location.lat.toFixed(2)},${location.lng.toFixed(2)}`

    // Check cache first
    const cached = this.weatherCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < WeatherService.CACHE_DURATION) {
      console.log("[v0] Using cached weather data for:", cacheKey)
      return cached.data
    }

    try {
      // Use free weather API (wttr.in) as fallback
      const response = await fetch(`https://wttr.in/${location.lat},${location.lng}?format=j1`, {
        headers: {
          "User-Agent": "TravelDiscoveryApp/1.0",
        },
      })

      if (response.ok) {
        const data = await response.json()
        const weatherData = this.parseWttrResponse(data)

        // Cache the result
        this.weatherCache.set(cacheKey, {
          data: weatherData,
          timestamp: Date.now(),
        })

        return weatherData
      }
    } catch (error) {
      console.warn("[v0] Weather API failed, using mock data:", error)
    }

    // Fallback to mock weather data
    return this.generateMockWeatherData(location)
  }

  /**
   * Parse wttr.in API response
   */
  private parseWttrResponse(data: any): WeatherData {
    const current = data.current_condition?.[0]
    const weather = data.weather?.[0]

    return {
      temperature: Number.parseInt(current?.temp_C || weather?.maxtempC || "20"),
      condition: current?.weatherDesc?.[0]?.value || weather?.hourly?.[0]?.weatherDesc?.[0]?.value || "Clear",
      humidity: Number.parseInt(current?.humidity || "50"),
      windSpeed: Number.parseInt(current?.windspeedKmph || "10"),
      icon: this.getWeatherIcon(current?.weatherCode || weather?.hourly?.[0]?.weatherCode || "113"),
    }
  }

  /**
   * Generate mock weather data as fallback
   */
  private generateMockWeatherData(location: Location): WeatherData {
    const conditions = [
      { condition: "Clear", icon: "☀️", tempRange: [18, 28] },
      { condition: "Partly Cloudy", icon: "⛅", tempRange: [15, 25] },
      { condition: "Cloudy", icon: "☁️", tempRange: [12, 22] },
      { condition: "Light Rain", icon: "🌦️", tempRange: [10, 20] },
      { condition: "Sunny", icon: "🌞", tempRange: [20, 30] },
    ]

    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)]
    const temperature = Math.floor(
      Math.random() * (randomCondition.tempRange[1] - randomCondition.tempRange[0]) + randomCondition.tempRange[0],
    )

    return {
      temperature,
      condition: randomCondition.condition,
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
      icon: randomCondition.icon,
    }
  }

  /**
   * Convert weather code to emoji icon
   */
  private getWeatherIcon(code: string): string {
    const iconMap: Record<string, string> = {
      "113": "☀️", // Clear/Sunny
      "116": "⛅", // Partly cloudy
      "119": "☁️", // Cloudy
      "122": "☁️", // Overcast
      "143": "🌫️", // Mist
      "176": "🌦️", // Patchy rain possible
      "179": "🌨️", // Patchy snow possible
      "182": "🌧️", // Patchy sleet possible
      "185": "🌧️", // Patchy freezing drizzle possible
      "200": "⛈️", // Thundery outbreaks possible
      "227": "🌨️", // Blowing snow
      "230": "❄️", // Blizzard
      "248": "🌫️", // Fog
      "260": "🌫️", // Freezing fog
      "263": "🌦️", // Patchy light drizzle
      "266": "🌧️", // Light drizzle
      "281": "🌧️", // Freezing drizzle
      "284": "🌧️", // Heavy freezing drizzle
      "293": "🌦️", // Patchy light rain
      "296": "🌧️", // Light rain
      "299": "🌧️", // Moderate rain at times
      "302": "🌧️", // Moderate rain
      "305": "🌧️", // Heavy rain at times
      "308": "🌧️", // Heavy rain
      "311": "🌧️", // Light freezing rain
      "314": "🌧️", // Moderate or heavy freezing rain
      "317": "🌧️", // Light sleet
      "320": "🌧️", // Moderate or heavy sleet
      "323": "🌨️", // Patchy light snow
      "326": "🌨️", // Light snow
      "329": "🌨️", // Patchy moderate snow
      "332": "🌨️", // Moderate snow
      "335": "🌨️", // Patchy heavy snow
      "338": "❄️", // Heavy snow
      "350": "🌧️", // Ice pellets
      "353": "🌦️", // Light rain shower
      "356": "🌧️", // Moderate or heavy rain shower
      "359": "🌧️", // Torrential rain shower
      "362": "🌧️", // Light sleet showers
      "365": "🌧️", // Moderate or heavy sleet showers
      "368": "🌨️", // Light snow showers
      "371": "❄️", // Moderate or heavy snow showers
      "374": "🌧️", // Light showers of ice pellets
      "377": "🌧️", // Moderate or heavy showers of ice pellets
      "386": "⛈️", // Patchy light rain with thunder
      "389": "⛈️", // Moderate or heavy rain with thunder
      "392": "⛈️", // Patchy light snow with thunder
      "395": "⛈️", // Moderate or heavy snow with thunder
    }

    return iconMap[code] || "🌤️"
  }

  /**
   * Get weather suitability score for outdoor activities (0-1)
   */
  getWeatherSuitabilityScore(weather: WeatherData): number {
    let score = 1.0

    // Temperature scoring (optimal 18-25°C)
    if (weather.temperature < 5 || weather.temperature > 35) {
      score *= 0.3
    } else if (weather.temperature < 10 || weather.temperature > 30) {
      score *= 0.6
    } else if (weather.temperature < 15 || weather.temperature > 28) {
      score *= 0.8
    }

    // Weather condition scoring
    const conditionScores: Record<string, number> = {
      Clear: 1.0,
      Sunny: 1.0,
      "Partly Cloudy": 0.9,
      Cloudy: 0.7,
      Overcast: 0.6,
      "Light Rain": 0.4,
      Rain: 0.2,
      "Heavy Rain": 0.1,
      Snow: 0.3,
      Thunderstorm: 0.1,
    }

    const conditionScore = conditionScores[weather.condition] || 0.5
    score *= conditionScore

    // Wind speed scoring (optimal < 20 km/h)
    if (weather.windSpeed > 40) {
      score *= 0.3
    } else if (weather.windSpeed > 25) {
      score *= 0.7
    }

    return Math.max(0, Math.min(1, score))
  }
}

export const weatherService = new WeatherService()
