import { type NextRequest, NextResponse } from "next/server"
import { routeOrchestrator } from "@/lib/route-orchestrator"
import type { RouteInput } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API: Processing route request")

    const routeInput: RouteInput = await request.json()

    // Validate input
    if (!routeInput.from || !routeInput.to || !routeInput.departureTime) {
      return NextResponse.json({ error: "Missing required fields: from, to, or departureTime" }, { status: 400 })
    }

    // Process the route
    const tripPlan = await routeOrchestrator.processRoute(routeInput)

    console.log("[v0] API: Route processed successfully, trip ID:", tripPlan.id)

    return NextResponse.json(tripPlan)
  } catch (error) {
    console.error("[v0] API: Error processing route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
