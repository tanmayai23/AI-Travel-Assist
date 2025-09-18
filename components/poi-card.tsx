"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Star,
  Clock,
  Phone,
  Globe,
  Navigation,
  Thermometer,
  Cloud,
  Wind,
  Droplets,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react"
import type { ScoredPOI } from "@/lib/ai-poi-filter"
import { DistanceCalculator } from "@/lib/distance-calculator"

interface POICardProps {
  poi: ScoredPOI
  onNavigate?: (poi: ScoredPOI) => void
  onSaveToFavorites?: (poi: ScoredPOI) => void
  showAIInsights?: boolean
}

export function POICard({ poi, onNavigate, onSaveToFavorites, showAIInsights = true }: POICardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  const getPriceLevelText = (level: number) => {
    const levels = ["Free", "$", "$$", "$$$", "$$$$"]
    return levels[level] || "$$"
  }

  const getAIScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500/90 text-white"
    if (score >= 0.6) return "bg-blue-500/90 text-white"
    if (score >= 0.4) return "bg-yellow-500/90 text-white"
    return "bg-slate-500/90 text-white"
  }

  const formatDistanceWithContext = (distance: number, closestTo?: "origin" | "destination") => {
    const formattedDistance = DistanceCalculator.formatDistance(distance)
    if (closestTo) {
      const locationText = closestTo === "origin" ? "from start" : "from destination"
      return `${formattedDistance} ${locationText}`
    }
    return `${formattedDistance} detour`
  }

  return (
    <Card className="group w-full max-w-md mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      {/* POI Image with overlay */}
      <div className="relative h-56 w-full overflow-hidden">
        {!imageError ? (
          <img
            src={poi.photos[0] || "/placeholder.svg"}
            alt={poi.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            <MapPin className="h-16 w-16 text-slate-400" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-white/90 text-slate-800 text-xs font-semibold backdrop-blur-sm border-0 shadow-lg">
            {poi.category}
          </Badge>
          {poi.priceLevel && (
            <Badge variant="outline" className="bg-white/80 text-slate-700 text-xs border-white/50 backdrop-blur-sm">
              {getPriceLevelText(poi.priceLevel)}
            </Badge>
          )}
        </div>

        {/* Weather overlay */}
        {poi.weather && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 text-sm flex items-center gap-2 shadow-lg">
            <span className="text-2xl">{poi.weather.icon}</span>
            <div className="text-slate-700">
              <div className="font-bold">{poi.weather.temperature}°C</div>
              <div className="text-xs text-slate-500">{poi.weather.condition}</div>
            </div>
          </div>
        )}

        {/* AI Score badge */}
        {showAIInsights && (
          <div className="absolute bottom-3 right-3">
            <div className={`px-3 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm shadow-lg ${getAIScoreColor(poi.aiScore)}`}>
              AI {Math.round(poi.aiScore * 100)}%
            </div>
          </div>
        )}

        {/* Rating and distance */}
        <div className="absolute bottom-3 left-3 flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-lg">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-bold text-slate-800">{poi.rating}</span>
          </div>
          
          {poi.distanceFromRoute > 0 && (
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-slate-700 font-medium shadow-lg">
              <Navigation className="h-3 w-3" />
              {formatDistanceWithContext(poi.distanceFromRoute, poi.closestTo)}
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Title and description */}
        <div>
          <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 leading-tight mb-2 line-clamp-2">{poi.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{poi.description}</p>
        </div>

        {/* AI Recommendation */}
        {showAIInsights && poi.aiRecommendationReason && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                <Star className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">AI Recommendation</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-200 leading-relaxed">{poi.aiRecommendationReason}</p>
          </div>
        )}

        {/* Quick Info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-slate-500" />
            <span className="leading-relaxed">{poi.location.address}</span>
          </div>

          {poi.openingHours && poi.openingHours.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
              <Clock className="h-4 w-4 flex-shrink-0 text-slate-500" />
              <span>{poi.openingHours[0]}</span>
            </div>
          )}
        </div>

        {/* Weather Details (if expanded) */}
        {isExpanded && poi.weather && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Cloud className="h-4 w-4" />
              Weather Details
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Thermometer className="h-4 w-4 text-red-500" />
                <span>{poi.weather.temperature}°C</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Wind className="h-4 w-4 text-blue-500" />
                <span>{poi.weather.windSpeed} km/h</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Droplets className="h-4 w-4 text-blue-400" />
                <span>{poi.weather.humidity}% humidity</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Cloud className="h-4 w-4 text-gray-500" />
                <span>{poi.weather.condition}</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Score Breakdown (if expanded and AI insights enabled) */}
        {isExpanded && showAIInsights && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Analysis</h4>
            <div className="space-y-2">
              {[
                { label: "Weather Suitability", value: poi.scoreBreakdown.weatherSuitability, color: "bg-blue-500" },
                { label: "Preference Match", value: poi.scoreBreakdown.preferenceMatch, color: "bg-green-500" },
                { label: "Time Relevance", value: poi.scoreBreakdown.timeRelevance, color: "bg-yellow-500" },
                { label: "Popularity", value: poi.scoreBreakdown.popularityScore, color: "bg-purple-500" }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all duration-300`}
                        style={{ width: `${item.value * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-8">{Math.round(item.value * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info (if expanded) */}
        {isExpanded && (poi.phone || poi.website) && (
          <div className="space-y-3 pt-2">
            {poi.phone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <a href={`tel:${poi.phone}`} className="text-green-600 dark:text-green-400 hover:underline font-medium">
                  {poi.phone}
                </a>
              </div>
            )}
            {poi.website && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <a
                  href={poi.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 font-medium"
                >
                  Visit Website
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => onNavigate?.(poi)}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Navigate
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-12 w-12 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {onSaveToFavorites && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-12 w-12 border-slate-200 dark:border-slate-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-300 dark:hover:border-yellow-600"
              onClick={() => onSaveToFavorites(poi)}
            >
              <Star className="h-4 w-4 text-yellow-500" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
