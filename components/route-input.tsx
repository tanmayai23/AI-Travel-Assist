"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock, X } from "lucide-react"
import type { RouteInput } from "@/lib/types"

interface RouteInputProps {
  onRouteSubmit: (route: RouteInput) => void
  isLoading?: boolean
}

interface LocationSuggestion {
  lat: number
  lng: number
  address: string
  placeId?: string
}

const PREFERENCE_OPTIONS = [
  "Restaurants",
  "Museums",
  "Parks",
  "Shopping",
  "Historic Sites",
  "Entertainment",
  "Outdoor Activities",
  "Art Galleries",
  "Local Markets",
  "Scenic Views",
  "Coffee Shops",
  "Nightlife",
]

export function RouteInputComponent({ onRouteSubmit, isLoading = false }: RouteInputProps) {
  const [fromAddress, setFromAddress] = useState("")
  const [toAddress, setToAddress] = useState("")
  const [departureDate, setDepartureDate] = useState("")
  const [departureTime, setDepartureTime] = useState("")
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([])
  const [isGeolocating, setIsGeolocating] = useState(false)

  const [fromSuggestions, setFromSuggestions] = useState<LocationSuggestion[]>([])
  const [toSuggestions, setToSuggestions] = useState<LocationSuggestion[]>([])
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)
  const [selectedFromLocation, setSelectedFromLocation] = useState<LocationSuggestion | null>(null)
  const [selectedToLocation, setSelectedToLocation] = useState<LocationSuggestion | null>(null)
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const searchLocations = async (query: string, isFrom: boolean) => {
      if (query.length < 2) {
        if (isFrom) setFromSuggestions([])
        else setToSuggestions([])
        return
      }

      try {
        const response = await fetch(`/api/search-locations?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          if (isFrom) {
            setFromSuggestions(data.results || [])
          } else {
            setToSuggestions(data.results || [])
          }
        }
      } catch (error) {
        console.error("[v0] Error searching locations:", error)
      }
    }

    const timeoutId = setTimeout(() => {
      if (fromAddress && !selectedFromLocation) {
        searchLocations(fromAddress, true)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [fromAddress, selectedFromLocation])

  useEffect(() => {
    const searchLocations = async (query: string, isFrom: boolean) => {
      if (query.length < 2) {
        if (isFrom) setFromSuggestions([])
        else setToSuggestions([])
        return
      }

      try {
        const response = await fetch(`/api/search-locations?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          if (isFrom) {
            setFromSuggestions(data.results || [])
          } else {
            setToSuggestions(data.results || [])
          }
        }
      } catch (error) {
        console.error("[v0] Error searching locations:", error)
      }
    }

    const timeoutId = setTimeout(() => {
      if (toAddress && !selectedToLocation) {
        searchLocations(toAddress, false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [toAddress, selectedToLocation])

  const handlePreferenceToggle = (preference: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(preference) ? prev.filter((p) => p !== preference) : [...prev, preference],
    )
  }

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    setIsGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          )
          const data = await response.json()
          const address = data.display_name || `${latitude}, ${longitude}`
          setFromAddress(address)
          setSelectedFromLocation({
            lat: latitude,
            lng: longitude,
            address: address,
          })
        } catch (error) {
          const address = `${latitude}, ${longitude}`
          setFromAddress(address)
          setSelectedFromLocation({
            lat: latitude,
            lng: longitude,
            address: address,
          })
        }
        setIsGeolocating(false)
      },
      (error) => {
        console.error("Error getting location:", error)
        alert("Unable to get your current location.")
        setIsGeolocating(false)
      },
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fromAddress || !toAddress || !departureDate || !departureTime) {
      alert("Please fill in all required fields.")
      return
    }

    let fromLocation = selectedFromLocation
    let toLocation = selectedToLocation

    // If no suggestion selected, try to geocode the entered address
    if (!fromLocation && fromAddress) {
      try {
        const response = await fetch(`/api/search-locations?q=${encodeURIComponent(fromAddress)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            fromLocation = data.results[0]
          } else {
            // Fallback: create a basic location object
            fromLocation = {
              lat: 0,
              lng: 0,
              address: fromAddress,
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error geocoding from address:", error)
        fromLocation = {
          lat: 0,
          lng: 0,
          address: fromAddress,
        }
      }
    }

    if (!toLocation && toAddress) {
      try {
        const response = await fetch(`/api/search-locations?q=${encodeURIComponent(toAddress)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            toLocation = data.results[0]
          } else {
            // Fallback: create a basic location object
            toLocation = {
              lat: 0,
              lng: 0,
              address: toAddress,
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error geocoding to address:", error)
        toLocation = {
          lat: 0,
          lng: 0,
          address: toAddress,
        }
      }
    }

    if (!fromLocation || !toLocation) {
      alert("Unable to process the entered locations. Please try again.")
      return
    }

    try {
      const departureDateTime = new Date(`${departureDate}T${departureTime}`)

      const routeInput: RouteInput = {
        from: {
          lat: fromLocation.lat,
          lng: fromLocation.lng,
          address: fromLocation.address,
        },
        to: {
          lat: toLocation.lat,
          lng: toLocation.lng,
          address: toLocation.address,
        },
        departureTime: departureDateTime,
        preferences: selectedPreferences,
      }

      console.log("[v0] Route submitted:", routeInput)
      onRouteSubmit(routeInput)
    } catch (error) {
      console.error("Error processing route:", error)
      alert("Error processing your route. Please try again.")
    }
  }

  const handleFromSuggestionSelect = (suggestion: LocationSuggestion) => {
    setFromAddress(suggestion.address)
    setSelectedFromLocation(suggestion)
    setShowFromSuggestions(false)
    setFromSuggestions([])
  }

  const handleToSuggestionSelect = (suggestion: LocationSuggestion) => {
    setToAddress(suggestion.address)
    setSelectedToLocation(suggestion)
    setShowToSuggestions(false)
    setToSuggestions([])
  }

  const handleFromInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromAddress(e.target.value)
    setSelectedFromLocation(null)
    setShowFromSuggestions(true)
  }

  const handleToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToAddress(e.target.value)
    setSelectedToLocation(null)
    setShowToSuggestions(true)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-0 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Plan Your Journey
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-300 text-lg mt-2 max-w-lg mx-auto leading-relaxed">
            Discover amazing places along your route with AI-powered recommendations
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Location Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* From Location */}
              <div className="space-y-3">
                <Label htmlFor="from" className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  From
                </Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <Input
                      ref={fromInputRef}
                      id="from"
                      type="text"
                      placeholder="Enter starting location"
                      value={fromAddress}
                      onChange={handleFromInputChange}
                      onFocus={() => setShowFromSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                      className="pl-16 h-14 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                    {showFromSuggestions && fromSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                        {fromSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
                            onClick={() => handleFromSuggestionSelect(suggestion)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                <MapPin className="h-3 w-3 text-slate-500" />
                              </div>
                              <span className="text-sm text-slate-700 dark:text-slate-200">{suggestion.address}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCurrentLocation}
                    disabled={isGeolocating}
                    className="h-14 w-14 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                  >
                    {isGeolocating ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    ) : (
                      <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* To Location */}
              <div className="space-y-3">
                <Label htmlFor="to" className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  To
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <Input
                    ref={toInputRef}
                    id="to"
                    type="text"
                    placeholder="Enter destination"
                    value={toAddress}
                    onChange={handleToInputChange}
                    onFocus={() => setShowToSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                    className="pl-16 h-14 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  {showToSuggestions && toSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {toSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
                          onClick={() => handleToSuggestionSelect(suggestion)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                              <MapPin className="h-3 w-3 text-slate-500" />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-200">{suggestion.address}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Departure Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="date" className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Departure Date
                </Label>
                <div className="relative">
                  <Input
                    id="date"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="h-14 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20"
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="time" className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Departure Time
                </Label>
                <div className="relative">
                  <Input
                    id="time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="h-14 text-base rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"></div>
                What interests you? (Optional)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {PREFERENCE_OPTIONS.map((preference) => (
                  <Button
                    key={preference}
                    type="button"
                    variant={selectedPreferences.includes(preference) ? "default" : "outline"}
                    onClick={() => handlePreferenceToggle(preference)}
                    className={`h-12 rounded-xl transition-all duration-200 ${
                      selectedPreferences.includes(preference)
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl"
                        : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                  >
                    <span className="text-sm font-medium">{preference}</span>
                    {selectedPreferences.includes(preference) && (
                      <X className="ml-2 h-3 w-3" />
                    )}
                  </Button>
                ))}
              </div>
              {selectedPreferences.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Selected {selectedPreferences.length} preference{selectedPreferences.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-16 text-lg font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Finding Amazing Places...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-3 h-5 w-5" />
                    Discover Places Along My Route
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
