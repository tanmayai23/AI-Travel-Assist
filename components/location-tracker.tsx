"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  MapPin,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Route,
  Target,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { useGeolocation } from "@/hooks/use-geolocation"
import type { TripPlan, Location } from "@/lib/types"
import type { ScoredPOI } from "@/lib/ai-poi-filter"

interface LocationTrackerProps {
  tripPlan: TripPlan | null
  onLocationUpdate?: (location: Location) => void
  onNearbyPOI?: (poi: ScoredPOI) => void
}

export function LocationTracker({ tripPlan, onLocationUpdate, onNearbyPOI }: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [visitedPOIs, setVisitedPOIs] = useState<Set<string>>(new Set())
  const [nearbyPOIs, setNearbyPOIs] = useState<ScoredPOI[]>([])
  const [routeProgress, setRouteProgress] = useState(0)
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null)

  const {
    latitude,
    longitude,
    accuracy,
    speed,
    error,
    loading,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isWatching,
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
    watch: isTracking,
  })

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Update location and check for nearby POIs
  useEffect(() => {
    if (latitude && longitude && tripPlan) {
      const currentLocation: Location = {
        lat: latitude,
        lng: longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      }

      console.log("[v0] Current location:", currentLocation)
      onLocationUpdate?.(currentLocation)

      // Check for nearby POIs (within 500m)
      const nearby = tripPlan.pois.filter((poi) => {
        const distance = calculateDistance(latitude, longitude, poi.location.lat, poi.location.lng)
        return distance <= 0.5 // 500 meters
      }) as ScoredPOI[]

      setNearbyPOIs(nearby)

      // Notify about new nearby POIs
      nearby.forEach((poi) => {
        if (!visitedPOIs.has(poi.id)) {
          console.log("[v0] New nearby POI:", poi.name)
          onNearbyPOI?.(poi)
        }
      })

      // Calculate route progress
      if (tripPlan.route.from && tripPlan.route.to) {
        const totalDistance = calculateDistance(
          tripPlan.route.from.lat,
          tripPlan.route.from.lng,
          tripPlan.route.to.lat,
          tripPlan.route.to.lng,
        )

        const distanceFromStart = calculateDistance(
          tripPlan.route.from.lat,
          tripPlan.route.from.lng,
          latitude,
          longitude,
        )

        const progress = Math.min(100, (distanceFromStart / totalDistance) * 100)
        setRouteProgress(progress)

        // Estimate arrival time based on current speed and remaining distance
        if (speed && speed > 0) {
          const remainingDistance = totalDistance - distanceFromStart
          const remainingTimeHours = remainingDistance / (speed * 3.6) // Convert m/s to km/h
          const arrival = new Date(Date.now() + remainingTimeHours * 60 * 60 * 1000)
          setEstimatedArrival(arrival)
        }
      }
    }
  }, [latitude, longitude, tripPlan, onLocationUpdate, onNearbyPOI, visitedPOIs, speed])

  const handleStartTracking = () => {
    setIsTracking(true)
    startWatching()
  }

  const handleStopTracking = () => {
    setIsTracking(false)
    stopWatching()
  }

  const handleMarkVisited = (poiId: string) => {
    setVisitedPOIs((prev) => new Set([...prev, poiId]))
  }

  const formatSpeed = (speedMs: number | null): string => {
    if (!speedMs) return "0 km/h"
    const speedKmh = speedMs * 3.6
    return `${speedKmh.toFixed(1)} km/h`
  }

  const formatAccuracy = (acc: number | null): string => {
    if (!acc) return "Unknown"
    if (acc < 10) return "High"
    if (acc < 50) return "Medium"
    return "Low"
  }

  if (!tripPlan) {
    return (
      <div className="w-full max-w-md mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-0 shadow-lg rounded-2xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Ready to Track</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Plan a route to start location tracking</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-0 shadow-xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Location Tracker</h3>
              <p className="text-blue-100 text-sm">Real-time GPS monitoring</p>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {isWatching ? (
              <div className="flex items-center gap-2 bg-green-500/20 backdrop-blur-sm rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-100">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full" />
                <span className="text-sm font-medium text-slate-200">Stopped</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            {!isWatching ? (
              <Button 
                size="sm" 
                onClick={handleStartTracking} 
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Tracking
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleStopTracking}
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}

            <Button 
              size="sm" 
              variant="outline" 
              onClick={getCurrentPosition} 
              disabled={loading}
              className="border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {accuracy && (
            <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
              accuracy < 10 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
              accuracy < 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}>
              {formatAccuracy(accuracy)} GPS
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Current Location Info */}
        {latitude && longitude && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Current Position
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Latitude</p>
                <p className="font-mono text-sm text-slate-700 dark:text-slate-200">{latitude.toFixed(6)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Longitude</p>
                <p className="font-mono text-sm text-slate-700 dark:text-slate-200">{longitude.toFixed(6)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Speed</p>
                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{formatSpeed(speed)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Accuracy</p>
                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                  {accuracy ? `±${Math.round(accuracy)}m` : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Route Progress */}
        {routeProgress > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Route className="h-4 w-4" />
                Journey Progress
              </h4>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{routeProgress.toFixed(1)}%</span>
            </div>
            <div className="relative">
              <Progress value={routeProgress} className="h-3 bg-blue-100 dark:bg-blue-900/50" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" 
                   style={{ width: `${routeProgress}%` }} />
            </div>
            {estimatedArrival && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300">
                <Clock className="h-4 w-4" />
                <span>Estimated arrival: {estimatedArrival.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Nearby POIs */}
        {nearbyPOIs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Target className="h-4 w-4" />
              Nearby Places
              <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{nearbyPOIs.length}</span>
              </div>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {nearbyPOIs.map((poi) => (
                <div key={poi.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{poi.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{poi.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {visitedPOIs.has(poi.id) ? (
                      <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-lg text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        Visited
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleMarkVisited(poi.id)}
                        className="h-8 w-8 p-0 border-green-200 hover:bg-green-50 dark:border-green-700 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trip Stats */}
        {visitedPOIs.size > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Places Visited Today</span>
              <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span className="font-bold">{visitedPOIs.size}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
