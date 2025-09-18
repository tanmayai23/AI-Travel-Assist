"use client"

import { useState, useEffect } from "react"
import { RouteInputComponent } from "@/components/route-input"
import { POIGrid } from "@/components/poi-grid"
import { LocationTracker } from "@/components/location-tracker"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Bell } from "lucide-react"
import type { RouteInput, TripPlan, Location } from "@/lib/types"
import type { ScoredPOI } from "@/lib/ai-poi-filter"

export default function HomePage() {
  const [currentTrip, setCurrentTrip] = useState<TripPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [showTracker, setShowTracker] = useState(false)
  const [notifications, setNotifications] = useState<string[]>([])

  const handleRouteSubmit = async (route: RouteInput) => {
    setIsLoading(true)
    console.log("[v0] Route submitted:", route)

    try {
      const response = await fetch("/api/process-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(route),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const tripPlan: TripPlan = await response.json()
      setCurrentTrip(tripPlan)
      setShowTracker(true) // Auto-show tracker when trip is created

      console.log("[v0] Route processing complete, trip plan:", tripPlan)
    } catch (error) {
      console.error("[v0] Error processing route:", error)
      alert("Error processing your route. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigate = (poi: ScoredPOI) => {
    // Open navigation to POI
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.location.lat},${poi.location.lng}`
    if (typeof window !== 'undefined') {
      window.open(mapsUrl, "_blank")
    }
  }

  const handleSaveToFavorites = (poi: ScoredPOI) => {
    // Save POI to favorites (would integrate with user system)
    console.log("[v0] Saving POI to favorites:", poi.name)
    alert(`${poi.name} saved to favorites!`)
  }

  const handleLocationUpdate = (location: Location) => {
    setCurrentLocation(location)
    console.log("[v0] Location updated in main app:", location)
  }

  const handleNearbyPOI = (poi: ScoredPOI) => {
    const message = `📍 You're near ${poi.name}! ${poi.aiRecommendationReason}`
    setNotifications((prev) => [message, ...prev.slice(0, 4)]) // Keep last 5 notifications

    // Show browser notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === "granted") {
      new Notification(`Near ${poi.name}`, {
        body: poi.aiRecommendationReason,
        icon: "/abstract-location.png",
      })
    }
  }

  // Request notification permission on first load
  useEffect(() => {
    if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-full px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                AI-Powered Travel Assistant
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-slate-100 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mb-6 leading-tight">
              Discover Amazing
              <br />
              <span className="text-4xl md:text-5xl lg:text-6xl">Places to Visit</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 text-pretty max-w-3xl mx-auto leading-relaxed font-light">
              Transform your journey into an unforgettable adventure with personalized recommendations powered by AI, real-time weather, and local insights.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {/* Content Container with better spacing */}
        <div className="max-w-6xl mx-auto space-y-12">

        {/* Current Location Display */}
        {currentLocation && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-xl px-6 py-3 shadow-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Current Location:</span>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-8 space-y-3">
            {notifications.map((notification, index) => (
              <div
                key={index}
                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-amber-200/50 dark:border-amber-700/50 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 shadow-lg"
              >
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{notification}</p>
              </div>
            ))}
          </div>
        )}

        <RouteInputComponent onRouteSubmit={handleRouteSubmit} isLoading={isLoading} />

        {currentTrip && (
          <div className="mt-16 space-y-12">
            {/* Trip Controls */}
            <div className="flex justify-center gap-6">
              <Button 
                variant={showTracker ? "default" : "outline"} 
                onClick={() => setShowTracker(!showTracker)}
                className="h-12 px-6 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Navigation className="h-5 w-5 mr-2" />
                {showTracker ? "Hide Tracker" : "Show Tracker"}
              </Button>

              <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-xl px-6 py-3 shadow-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {currentTrip.pois.length} Places Found
                </span>
              </div>
            </div>

            {/* Location Tracker */}
            {showTracker && (
              <div className="flex justify-center">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl">
                  <LocationTracker
                    tripPlan={currentTrip}
                    onLocationUpdate={handleLocationUpdate}
                    onNearbyPOI={handleNearbyPOI}
                  />
                </div>
              </div>
            )}

            {/* POI Grid */}
            <POIGrid
              pois={currentTrip.pois as ScoredPOI[]}
              onNavigate={handleNavigate}
              onSaveToFavorites={handleSaveToFavorites}
              showAIInsights={true}
            />
          </div>
        )}
        
        </div>
      </div>
    </main>
  )
}
