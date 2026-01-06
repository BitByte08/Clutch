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

    const body = (await request.json()) as {
      puuid: string;
      count?: number;
    };
    const { puuid, count = 5 } = body;

    if (!puuid) {
      return NextResponse.json(
        { error: "Missing puuid" },
        { status: 400 }
      );
    }

    // queue=420은 솔로랭크만 필터링 (자유랭크, 일반게임 등 제외)
    const response = await fetch(
      `${ASIA_API_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=${count}&api_key=${RIOT_API_KEY}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch matches" },
        { status: 500 }
      );
    }

    const matchIds = await response.json();
    return NextResponse.json(matchIds);
  } catch (error) {
    console.error("Error fetching match IDs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
