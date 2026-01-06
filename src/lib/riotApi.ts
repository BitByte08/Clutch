import { Player, RiotLeagueData, GamePerformance } from "@/types";

// 플레이어 검색
export async function searchPlayer(
  summonerName: string,
  tagLine: string,
  region: string = "kr"
): Promise<Player | null> {
  try {
    const response = await fetch("/api/riot/player/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summonerName,
        tagLine,
        region,
      }),
    });

    if (!response.ok) {
      console.error("Player search failed:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching player:", error);
    return null;
  }
}

// 최근 5판의 매치 ID 가져오기
export async function getRecentMatchIds(
  puuid: string,
  count: number = 5
): Promise<string[]> {
  try {
    const response = await fetch("/api/riot/matches/recent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        puuid,
        count,
      }),
    });

    if (!response.ok) {
      console.error("Failed to fetch match IDs:", response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching match IDs:", error);
    return [];
  }
}

// 매치 상세 정보 가져오기
export async function getMatchDetails(matchId: string): Promise<any | null> {
  try {
    const response = await fetch("/api/riot/matches/details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        matchId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to fetch match details:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching match details:", error);
    return null;
  }
}

// 게임 성과 분석
export async function analyzeGamePerformance(
  matchData: any,
  playerPuuid: string,
  playerTier: string
): Promise<GamePerformance | null> {
  try {
    const response = await fetch("/api/riot/stats/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        matchData,
        playerPuuid,
        playerTier,
      }),
    });

    if (!response.ok) {
      console.error("Failed to analyze performance:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error analyzing performance:", error);
    return null;
  }
}

// 플레이어 최근 5판 분석
export async function analyzePlayerRecent(
  player: Player,
  region: string = "kr"
): Promise<GamePerformance[]> {
  try {
    const matchIds = await getRecentMatchIds(player.id, 5);
    const performances: GamePerformance[] = [];

    for (const matchId of matchIds) {
      const matchData = await getMatchDetails(matchId);
      if (!matchData) continue;

      const performance = await analyzeGamePerformance(
        matchData,
        player.id,
        player.tier
      );

      if (performance) {
        performances.push(performance);
      }
    }

    return performances;
  } catch (error) {
    console.error("Error analyzing player recent games:", error);
    return [];
  }
}
