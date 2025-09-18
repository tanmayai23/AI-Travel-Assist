"use client"
import { useState, useEffect, useCallback } from "react"

export interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number | null
  error: string | null
  loading: boolean
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
}

export function useGeolocation(options: GeolocationOptions = {}) {
  const { enableHighAccuracy = true, timeout = 10000, maximumAge = 60000, watch = false } = options

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
    error: null,
    loading: false,
  })

  const [watchId, setWatchId] = useState<number | null>(null)

  const updatePosition = useCallback((position: GeolocationPosition) => {
    console.log("[v0] Location updated:", position.coords.latitude, position.coords.longitude)

    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
      error: null,
      loading: false,
    })
  }, [])

  const updateError = useCallback((error: GeolocationPositionError) => {
    console.error("[v0] Geolocation error:", error.message)

    let errorMessage = "Unable to retrieve location"

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied by user"
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information unavailable"
        break
      case error.TIMEOUT:
        errorMessage = "Location request timed out"
        break
    }

    setState((prev) => ({
      ...prev,
      error: errorMessage,
      loading: false,
    }))
  }, [])

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
        loading: false,
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(updatePosition, updateError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    })
  }, [enableHighAccuracy, timeout, maximumAge, updatePosition, updateError])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
        loading: false,
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    const id = navigator.geolocation.watchPosition(updatePosition, updateError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    })

    setWatchId(id)
    console.log("[v0] Started watching location with ID:", id)
  }, [enableHighAccuracy, timeout, maximumAge, updatePosition, updateError])

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      console.log("[v0] Stopped watching location")
    }
  }, [watchId])

  // Auto-start watching if enabled
  useEffect(() => {
    if (watch) {
      startWatching()
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watch, startWatching, watchId])

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isWatching: watchId !== null,
  }
}
