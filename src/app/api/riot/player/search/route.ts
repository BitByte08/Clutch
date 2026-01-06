import { NextRequest, NextResponse } from "next/server";
import { Player } from "@/types";

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// 플랫폼/리전 맵핑 (account API는 regional, summoner/league는 platform)
const PLATFORM_BY_REGION: Record<string, string> = {
  kr: "kr",
  na: "na1",
  euw: "euw1",
};

const REGIONAL_BY_REGION: Record<string, string> = {
  kr: "asia",
  na: "americas",
  euw: "europe",
};

const PLATFORM_CANDIDATES_BY_CLUSTER: Record<string, string[]> = {
  // Limit to battle-tested hosts to avoid DNS failures
  asia: ["kr", "jp1", "oc1"],
  americas: ["na1", "br1", "la1", "la2"],
  europe: ["euw1", "eun1", "tr1", "ru"],
};

interface RiotSummonerData {
  id: string;
  accountId?: string;
  puuid: string;
  name: string;
  profileIconId: number;
}

interface RiotLeagueData {
  summonerId?: string;
  summonerName?: string;
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
}

const tierToPoints: Record<string, number> = {
  IRON: 0,
  BRONZE: 10,
  SILVER: 20,
  GOLD: 35,
  PLATINUM: 50,
  EMERALD: 65,
  DIAMOND: 75,
  MASTER: 85,
  GRANDMASTER: 92,
  CHALLENGER: 97,
};

const rankToPoints: Record<string, number> = {
  I: 2.5,
  II: 1.75,
  III: 1.0,
  IV: 0.25,
};

function calculatePlayerRating(data: RiotLeagueData): number {
  const tierPoints = tierToPoints[data.tier] || 0;
  const rankPoints = rankToPoints[data.rank] || 0;
  const lpPoints = data.leaguePoints / 100; // LP를 0-1 범위로 변환

  const baseRating = tierPoints + rankPoints + lpPoints;
  return Math.min(100, Math.max(0, baseRating));
}

export async function POST(request: NextRequest) {
  try {
    if (!RIOT_API_KEY) {
      console.error("RIOT_API_KEY is not set");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    console.log("RIOT_API_KEY exists:", !!RIOT_API_KEY);
    console.log("API Key length:", RIOT_API_KEY.length);

    const body = (await request.json()) as {
      summonerName: string;
      tagLine: string;
      region?: string;
    };
    const { summonerName, tagLine, region = "kr" } = body;

    const platformRegion = PLATFORM_BY_REGION[region] || "kr";
    const regionalCluster = REGIONAL_BY_REGION[region] || "asia";
    console.log("platformRegion", platformRegion, "regionalCluster", regionalCluster);

    if (!summonerName || !tagLine) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Step 1: 소환사 이름과 태그로 PUUID 조회
    const accountResponse = await fetch(
      `https://${regionalCluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(summonerName)}/${encodeURIComponent(tagLine)}`,
      {
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
      }
    );

    console.log("Account response status:", accountResponse.status);
    console.log("Account response URL:", accountResponse.url);

    if (!accountResponse.ok) {
      const errorBody = await accountResponse.text();
      console.error("Account lookup failed:", accountResponse.status, errorBody);
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    const accountData = (await accountResponse.json()) as {
      puuid: string;
      gameName: string;
      tagLine: string;
    };

    console.log("Account data", accountData);

    // Step 2: PUUID로 소환사 정보 조회 (try primary platform, then fallbacks within the same cluster)
    const platformCandidates = [
      platformRegion,
      ...((PLATFORM_CANDIDATES_BY_CLUSTER[regionalCluster] || []).filter(
        (p) => p !== platformRegion
      )),
    ];

    let summonerData: RiotSummonerData | null = null;
    let resolvedPlatform = platformRegion;

    for (const platform of platformCandidates) {
      try {
        const summonerResponse = await fetch(
          `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`,
          {
            headers: {
              "X-Riot-Token": RIOT_API_KEY,
            },
          }
        );

        console.log("Summoner response status", platform, summonerResponse.status);

        const summonerRaw = await summonerResponse.text();
        console.log("Summoner response body", platform, summonerRaw);

        if (!summonerResponse.ok) {
          console.warn("Summoner lookup failed on", platform, summonerResponse.status);
          continue;
        }

        try {
          const parsed = JSON.parse(summonerRaw) as RiotSummonerData;
          if (parsed.puuid) {
            summonerData = parsed;
            resolvedPlatform = platform;
            break;
          }
          console.warn("Summoner response missing puuid on", platform, parsed);
        } catch (parseError) {
          console.error("Failed to parse summoner response on", platform, parseError);
        }
      } catch (networkError) {
        console.warn("Summoner lookup network error on", platform, networkError);
        continue;
      }
    }

    // Step 2b: fallback by name on resolved platform if id still missing
    if (!summonerData) {
      for (const platform of platformCandidates) {
        try {
          const fallbackSummonerResponse = await fetch(
            `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(accountData.gameName)}`,
            {
              headers: {
                "X-Riot-Token": RIOT_API_KEY,
              },
            }
          );

          console.log("Fallback summoner status", platform, fallbackSummonerResponse.status);

          const fallbackRaw = await fallbackSummonerResponse.text();
          console.log("Fallback summoner body", platform, fallbackRaw);

          if (!fallbackSummonerResponse.ok) {
            console.warn("Fallback summoner lookup failed on", platform, fallbackSummonerResponse.status);
            continue;
          }

          try {
            const parsed = JSON.parse(fallbackRaw) as RiotSummonerData;
            if (parsed.puuid) {
              summonerData = parsed;
              resolvedPlatform = platform;
              break;
            }
            console.warn("Fallback summoner missing puuid on", platform, parsed);
          } catch (parseError) {
            console.error("Failed to parse fallback summoner response on", platform, parseError);
          }
        } catch (networkError) {
          console.warn("Fallback summoner network error on", platform, networkError);
          continue;
        }
      }
    }

    if (!summonerData || !summonerData.puuid) {
      console.error("Summoner data missing after all fallbacks");
      return NextResponse.json(
        {
          error: "Summoner data unavailable (puuid missing)",
          detail: "No summoner record returned by Riot",
        },
        { status: 404 }
      );
    }

    const effectiveName = summonerData.name || accountData.gameName;
    const effectiveProfileIconId = summonerData.profileIconId ?? 0;

    console.log(
      "Resolved platform for summoner",
      resolvedPlatform,
      "puuid",
      summonerData.puuid,
      "name",
      effectiveName,
      "profileIconId",
      effectiveProfileIconId
    );

    // Use league-v4 by-puuid to avoid needing encryptedSummonerId when Riot filters PII
    const leagueResponse = await fetch(
      `https://${resolvedPlatform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${summonerData.puuid}`,
      {
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
      }
    );

    console.log("League response status:", leagueResponse.status);
    console.log("League request URL:", leagueResponse.url);

    if (!leagueResponse.ok) {
      const errorBody = await leagueResponse.text();
      console.error(
        "League lookup failed:",
        leagueResponse.status,
        errorBody
      );
      return NextResponse.json(
        { error: "Failed to fetch league info", detail: errorBody },
        { status: 500 }
      );
    }

    const leagueRaw = await leagueResponse.text();
    console.log("League response body:", leagueRaw);

    let leagueEntries: RiotLeagueData[];
    try {
      leagueEntries = JSON.parse(leagueRaw) as RiotLeagueData[];
      console.log("League entries count:", leagueEntries.length);
      console.log("League entries:", leagueEntries.map(e => ({ queueType: e.queueType, tier: e.tier })));
    } catch (parseError) {
      console.error("Failed to parse league response", parseError);
      return NextResponse.json(
        { error: "Failed to parse league info", detail: leagueRaw },
        { status: 500 }
      );
    }

    // 솔로 랭크 정보만 추출 (자유랭크, 기타 큐 무시)
    const soloRankData = leagueEntries.find(
      (entry) => entry.queueType === "RANKED_SOLO_5x5"
    );

    console.log("Solo rank data found:", !!soloRankData, soloRankData);

    // 언랭크 플레이어 처리 (랭크 게임을 하지 않은 경우)
    let tier = "IRON";
    let rank = "IV";
    let lp = 0;
    let rating = 0;
    let isUnranked = false;

    if (soloRankData) {
      tier = soloRankData.tier;
      rank = soloRankData.rank;
      lp = soloRankData.leaguePoints;
      rating = calculatePlayerRating(soloRankData);
      console.log("Ranked player - tier:", tier, "rank:", rank, "lp:", lp);
    } else {
      isUnranked = true;
      console.log("Unranked player detected - setting isUnranked to true");
    }

    // 플레이어 객체 구성
    const player: Player = {
      id: summonerData.puuid,
      name: effectiveName,
      tag: tagLine,
      tier: tier,
      rank: parseInt(rank) || 4,
      lp: lp,
      rating: rating,
      adjustedRating: rating, // 언랭도 초기 adjustedRating 설정
      isUnranked: isUnranked,
      region: region.toUpperCase(),
      profileIconId: effectiveProfileIconId,
    };

    return NextResponse.json(player);
  } catch (error) {
    console.error("Error in player search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
