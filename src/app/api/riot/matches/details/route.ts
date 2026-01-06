import { NextRequest, NextResponse } from "next/server";

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const ASIA_API_URL = "https://asia.api.riotgames.com";

export async function POST(request: NextRequest) {
  try {
    if (!RIOT_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { matchId: string };
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing matchId" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${ASIA_API_URL}/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch match details" },
        { status: 500 }
      );
    }

    const matchData = await response.json();
    return NextResponse.json(matchData);
  } catch (error) {
    console.error("Error fetching match details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
