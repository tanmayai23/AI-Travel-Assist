import { type NextRequest, NextResponse } from "next/server"
import { geocodingService } from "@/lib/geocoding-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
    }

    console.log("[v0] API: Searching locations for:", query)

    const results = await geocodingService.searchLocations(query)

    console.log("[v0] API: Found locations:", results.length)

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] API: Error searching locations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
