"use client"
import { useState } from "react"
import { POICard } from "./poi-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, MapPin, Clock } from "lucide-react"
import type { ScoredPOI } from "@/lib/ai-poi-filter"

interface POIGridProps {
  pois: ScoredPOI[]
  onNavigate?: (poi: ScoredPOI) => void
  onSaveToFavorites?: (poi: ScoredPOI) => void
  showAIInsights?: boolean
}

export function POIGrid({ pois, onNavigate, onSaveToFavorites, showAIInsights = true }: POIGridProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"aiScore" | "rating" | "distance">("aiScore")
  const [showFilters, setShowFilters] = useState(false)

  // Get unique categories
  const categories = Array.from(new Set(pois.map((poi) => poi.category)))

  // Filter and sort POIs
  const filteredAndSortedPOIs = pois
    .filter((poi) => {
      const matchesSearch =
        poi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poi.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || poi.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "aiScore":
          return b.aiScore - a.aiScore
        case "rating":
          return (b.rating || 0) - (a.rating || 0)
        case "distance":
          return (a.distanceFromRoute || 0) - (b.distanceFromRoute || 0)
        default:
          return 0
      }
    })

  const handleNavigateAll = () => {
    // Open all POIs in a map view (would integrate with mapping service)
    const coordinates = filteredAndSortedPOIs.map((poi) => `${poi.location.lat},${poi.location.lng}`).join("|")

    const mapsUrl = `https://www.google.com/maps/dir/${coordinates}`
    window.open(mapsUrl, "_blank")
  }

  if (pois.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No places found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your route or preferences to discover amazing places.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-balance">Discover Amazing Places</h2>
          <p className="text-muted-foreground">Found {filteredAndSortedPOIs.length} places along your route</p>
        </div>

        <Button onClick={handleNavigateAll} className="hidden md:flex">
          <MapPin className="h-4 w-4 mr-2" />
          View All on Map
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search places..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="px-3">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Category:</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Sort by:</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aiScore">AI Score</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Category badges */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory("all")}
        >
          All ({pois.length})
        </Badge>
        {categories.map((category) => {
          const count = pois.filter((poi) => poi.category === category).length
          return (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {category} ({count})
            </Badge>
          )
        })}
      </div>

      {/* POI Grid */}
      {filteredAndSortedPOIs.length === 0 ? (
        <div className="text-center py-8">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No places match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPOIs.map((poi) => (
            <POICard
              key={poi.id}
              poi={poi}
              onNavigate={onNavigate}
              onSaveToFavorites={onSaveToFavorites}
              showAIInsights={showAIInsights}
            />
          ))}
        </div>
      )}

      {/* Load more button (for pagination if needed) */}
      {filteredAndSortedPOIs.length > 12 && (
        <div className="text-center pt-6">
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Load More Places
          </Button>
        </div>
      )}
    </div>
  )
}
