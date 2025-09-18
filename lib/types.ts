export interface Location {
  lat: number
  lng: number
  address: string
}

export interface RouteInput {
  from: Location
  to: Location
  departureTime: Date
  preferences: string[]
}

export interface WeatherData {
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  icon: string
}

export interface POI {
  id: string
  name: string
  description: string
  category: string
  location: Location
  rating: number
  priceLevel: number
  photos: string[]
  openingHours: string[]
  website?: string
  phone?: string
  weather?: WeatherData
  aiScore: number
  distanceFromRoute: number
  closestTo?: "origin" | "destination"
}

export interface RouteCheckpoint {
  location: Location
  distanceFromStart: number
  estimatedTime: Date
}

export interface TripPlan {
  id: string
  route: RouteInput
  checkpoints: RouteCheckpoint[]
  pois: POI[]
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  categories: string[]
  priceRange: [number, number]
  weatherSensitive: boolean
  maxDetourDistance: number
}
