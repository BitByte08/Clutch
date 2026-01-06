import { NextRequest, NextResponse } from "next/server";

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// 챔피언 데이터 캐시
let championDataCache: Record<string, string> | null = null;
let championDataLastFetch: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

async function getChampionData(): Promise<Record<string, string>> {
  const now = Date.now();
  
  // 캐시가 유효하면 반환
  if (championDataCache && now - championDataLastFetch < CACHE_DURATION) {
    return championDataCache;
  }

  try {
    // Data Dragon에서 최신 챔피언 데이터 가져오기
    const versionResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await versionResponse.json();
    const latestVersion = versions[0];

    const championResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/ko_KR/champion.json`
    );
    const championData = await championResponse.json();

    // championId를 key로 하는 맵 생성
    const idToName: Record<string, string> = {};
    Object.values(championData.data).forEach((champ: any) => {
      idToName[champ.key] = champ.name;
    });

    championDataCache = idToName;
    championDataLastFetch = now;
    
    return idToName;
  } catch (error) {
    console.error("Failed to fetch champion data:", error);
    // 에러 시 빈 객체 반환
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const { puuid, region } = await request.json();

    if (!puuid || !region) {
      return NextResponse.json(
        { error: "Missing puuid or region" },
        { status: 400 }
      );
    }

    const platformMap: Record<string, string> = {
      kr: "kr",
      na: "na1",
      euw: "euw1",
    };

    const platform = platformMap[region] || "kr";
    const masteryUrl = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`;

    const response = await fetch(masteryUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY!,
      },
    });

    if (!response.ok) {
      console.error("Mastery API error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Failed to fetch mastery data" },
        { status: response.status }
      );
    }

    const masteries = await response.json();

    // 챔피언 데이터 가져오기
    const championNames = await getChampionData();

    // 챔피언 이름 추가
    const masteriesWithNames = masteries.map((m: any) => ({
      championId: m.championId,
      championName: championNames[m.championId.toString()] || `Champion ${m.championId}`,
      championLevel: m.championLevel,
      championPoints: m.championPoints,
    }));

    return NextResponse.json(masteriesWithNames);
  } catch (error) {
    console.error("Mastery route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
