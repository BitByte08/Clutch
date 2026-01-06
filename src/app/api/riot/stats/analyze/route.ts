import { NextRequest, NextResponse } from "next/server";
import { GamePerformance } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const positionScoring: Record<string, Record<string, (stats: any, enemyLaner: any, gameDuration?: number) => number>> = {
  TOP: {
    csScore: (stats, _enemy, gameDuration) => {
      const cs = stats.totalMinionsKilled || stats.minionsKilled || 0;
      const gameMinutes = gameDuration ? gameDuration / 60 : 30;
      const csPerMin = cs / gameMinutes;
      // 10+ CS/min = 100점, 8 CS/min = 80점, 6 CS/min = 60점, 4 CS/min = 40점
      return Math.min(100, Math.max(0, csPerMin * 10));
    },
    kdaScore: (stats, _enemy) => {
      const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
      return Math.min(100, kda * 20);
    },
    damageScore: (stats, enemy) => {
      const damage = stats.totalDamageDealtToChampions || stats.totalDamageDealtToChamps || 0;
      const enemyDamage = enemy ? (enemy.totalDamageDealtToChampions || enemy.totalDamageDealtToChamps || 1) : damage * 0.9;
      const ratio = damage / Math.max(1, enemyDamage);
      return Math.min(100, ratio * 50);
    },
    goldScore: (stats, enemy) => {
      const gold = stats.goldEarned || 0;
      const enemyGold = enemy ? (enemy.goldEarned || 1) : gold * 0.9;
      const ratio = gold / Math.max(1, enemyGold);
      return Math.min(100, ratio * 50);
    },
  },
  JUNGLE: {
    csScore: (stats, _enemy, gameDuration) => {
      const cs = (stats.totalMinionsKilled || stats.minionsKilled || 0) + (stats.neutralMinionsKilled || 0);
      const gameMinutes = gameDuration ? gameDuration / 60 : 30;
      const csPerMin = cs / gameMinutes;
      // 정글은 라인보다 낙은 기준: 7+ CS/min = 100점, 5.5 CS/min = 80점, 4 CS/min = 60점
      return Math.min(100, Math.max(0, csPerMin * 14.28));
    },
    kdaScore: (stats, _enemy) => {
      const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
      return Math.min(100, kda * 20);
    },
    objectiveScore: (stats, _enemy) => {
      const objectives =
        (stats.baronKills || 0) * 2 +
        (stats.dragonKills || 0) * 2 +
        (stats.inhibitorKills || 0);
      return Math.min(100, objectives * 10);
    },
    damageScore: (stats, enemy) => {
      const damage = stats.totalDamageDealtToChampions || stats.totalDamageDealtToChamps || 0;
      const enemyDamage = enemy ? (enemy.totalDamageDealtToChampions || enemy.totalDamageDealtToChamps || 1) : damage * 0.9;
      const ratio = damage / Math.max(1, enemyDamage);
      return Math.min(100, ratio * 50);
    },
  },
  MID: {
    csScore: (stats, _enemy, gameDuration) => {
      const cs = stats.totalMinionsKilled || stats.minionsKilled || 0;
      const gameMinutes = gameDuration ? gameDuration / 60 : 30;
      const csPerMin = cs / gameMinutes;
      return Math.min(100, Math.max(0, csPerMin * 10));
    },
    kdaScore: (stats, enemy) => {
      const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
      return Math.min(100, kda * 20);
    },
    damageScore: (stats, enemy) => {
      const damage = stats.totalDamageDealtToChampions || stats.totalDamageDealtToChamps || 0;
      const enemyDamage = enemy ? (enemy.totalDamageDealtToChampions || enemy.totalDamageDealtToChamps || 1) : damage * 0.9;
      const ratio = damage / Math.max(1, enemyDamage);
      return Math.min(100, ratio * 50);
    },
    goldScore: (stats, enemy) => {
      const gold = stats.goldEarned || 0;
      const enemyGold = enemy ? (enemy.goldEarned || 1) : gold * 0.9;
      const ratio = gold / Math.max(1, enemyGold);
      return Math.min(100, ratio * 50);
    },
  },
  ADC: {
    csScore: (stats, _enemy, gameDuration) => {
      const cs = stats.totalMinionsKilled || stats.minionsKilled || 0;
      const gameMinutes = gameDuration ? gameDuration / 60 : 30;
      const csPerMin = cs / gameMinutes;
      return Math.min(100, Math.max(0, csPerMin * 10));
    },
    kdaScore: (stats, enemy) => {
      const kda = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
      return Math.min(100, kda * 20);
    },
    damageScore: (stats, enemy) => {
      const damage = stats.totalDamageDealtToChampions || stats.totalDamageDealtToChamps || 0;
      const enemyDamage = enemy ? (enemy.totalDamageDealtToChampions || enemy.totalDamageDealtToChamps || 1) : damage * 0.9;
      const ratio = damage / Math.max(1, enemyDamage);
      return Math.min(100, ratio * 50);
    },
    goldScore: (stats, enemy) => {
      const gold = stats.goldEarned || 0;
      const enemyGold = enemy ? (enemy.goldEarned || 1) : gold * 0.9;
      const ratio = gold / Math.max(1, enemyGold);
      return Math.min(100, ratio * 50);
    },
  },
  SUPPORT: {
    wardScore: (stats, _enemy) => {
      const wards = stats.wardsPlaced || stats.sightWardsBoughtInGame || 0;
      const enemyWards = _enemy ? (_enemy.wardsPlaced || _enemy.sightWardsBoughtInGame || 1) : wards * 0.9;
      const ratio = wards / Math.max(1, enemyWards);
      return Math.min(100, ratio * 50);
    },
    kdaScore: (stats, _enemy) => {
      const kda = (stats.kills + stats.assists * 1.5) / Math.max(1, stats.deaths);
      return Math.min(100, kda * 20);
    },
    visionScore: (stats, _enemy) => {
      const vision = stats.visionScore || 0;
      const enemyVision = _enemy ? (_enemy.visionScore || 1) : vision * 0.9;
      const ratio = vision / Math.max(1, enemyVision);
      return Math.min(100, ratio * 50);
    },
    damageScore: (stats, _enemy) => {
      const damage = stats.totalDamageDealtToChampions || stats.totalDamageDealtToChamps || 0;
      const enemyDamage = _enemy ? (_enemy.totalDamageDealtToChampions || _enemy.totalDamageDealtToChamps || 1) : damage * 0.9;
      const ratio = damage / Math.max(1, enemyDamage);
      return Math.min(100, ratio * 50);
    },
  },
};

// BOTTOM, UTILITY 등의 별칭 처리
const positionAliases: Record<string, string> = {
  BOTTOM: "ADC",
  BOT: "ADC",
  UTILITY: "SUPPORT",
  SUPP: "SUPPORT",
  MIDDLE: "MID",
};

function calculateGamePerformance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  participant: any,
  matchId: string,
  win: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enemyLaner: any,
  playerTier: string,
  gameTimestamp: number,
  gameDuration: number
): GamePerformance {
  const rawPosition = participant.teamPosition || participant.individualPosition || "UNKNOWN";
  const position = positionAliases[rawPosition] || rawPosition;
  const scoringFunctions = positionScoring[position];

  console.log("Position mapping:", rawPosition, "->", position, "has scoring:", !!scoringFunctions);

  let baseScore = 50;
  const scoreDetails: Record<string, number> = {};

  if (scoringFunctions) {
    Object.entries(scoringFunctions).forEach(([key, fn]) => {
      scoreDetails[key] = fn(participant, enemyLaner, gameDuration);
    });
    baseScore = Object.values(scoreDetails).reduce((a, b) => a + b, 0) / Object.values(scoreDetails).length;
  } else {
    console.warn("No scoring functions found for position:", position);
  }

  let winAdjustedScore = baseScore;
  // 승패 비중을 크게 높임 (승리 시 기본 70점 보장, 패배 시 최대 60점)
  if (win) {
    winAdjustedScore = Math.max(70, baseScore * 0.6 + 40);
  } else {
    winAdjustedScore = Math.min(60, baseScore * 0.8);
  }

  // 티어 보정 제거 (상대 라이너와의 비교로 대체)
  const performanceScore = winAdjustedScore;

  console.log("Participant data for performance:", {
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    minionsKilled: participant.minionsKilled,
    totalMinionsKilled: participant.totalMinionsKilled,
    neutralMinionsKilled: participant.neutralMinionsKilled,
    totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
    totalDamageDealtToChamps: participant.totalDamageDealtToChamps,
    goldEarned: participant.goldEarned,
  });

  const cs = (participant.totalMinionsKilled || participant.minionsKilled || 0) + (participant.neutralMinionsKilled || 0);
  const damageDealt = participant.totalDamageDealtToChampions || participant.totalDamageDealtToChamps || 0;

  const enemyCs = enemyLaner ? ((enemyLaner.totalMinionsKilled || enemyLaner.minionsKilled || 0) + (enemyLaner.neutralMinionsKilled || 0)) : 0;
  const enemyGold = enemyLaner ? (enemyLaner.goldEarned || 0) : 0;
  const enemyDamage = enemyLaner ? (enemyLaner.totalDamageDealtToChampions || enemyLaner.totalDamageDealtToChamps || 0) : 0;

  return {
    matchId,
    position,
    kills: participant.kills || 0,
    deaths: participant.deaths || 0,
    assists: participant.assists || 0,
    cs,
    gold: participant.goldEarned || 0,
    damageDealt,
    damageTaken: participant.totalDamageTaken || 0,
    objectives:
      (participant.baronKills || 0) +
      (participant.dragonKills || 0) +
      (participant.inhibitorKills || 0),
    win,
    enemyTeamTier: enemyLaner ? `${enemyLaner.championName} (상대 라이너)` : "N/A",
    gameTimestamp,
    performanceScore: Math.min(100, Math.max(0, performanceScore)),
    scoreBreakdown: {
      baseScore: Math.round(baseScore * 10) / 10,
      winAdjusted: Math.round(winAdjustedScore * 10) / 10,
      tierBonus: 1.0,
      final: Math.round(Math.min(100, Math.max(0, performanceScore)) * 10) / 10,
      details: Object.fromEntries(
        Object.entries(scoreDetails).map(([k, v]) => [k, Math.round(v * 10) / 10])
      ),
      supportStats: {
        wards: participant.wardsPlaced || participant.sightWardsBoughtInGame || 0,
        vision: participant.visionScore || 0,
      },
      enemyStats: enemyLaner ? {
        cs: enemyCs,
        gold: enemyGold,
        damage: enemyDamage,
        kills: enemyLaner.kills || 0,
        deaths: enemyLaner.deaths || 0,
        assists: enemyLaner.assists || 0,
        wards: enemyLaner.wardsPlaced || enemyLaner.sightWardsBoughtInGame || 0,
        vision: enemyLaner.visionScore || 0,
      } : undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchData: any;
      playerPuuid: string;
      playerTier: string;
    };
    const { matchData, playerPuuid, playerTier } = body;

    if (!matchData || !playerPuuid || !playerTier) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const playerParticipant = matchData.info.participants.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.puuid === playerPuuid
    );

    if (!playerParticipant) {
      return NextResponse.json(
        { error: "Player not found in match" },
        { status: 404 }
      );
    }

    const playerTeamId = playerParticipant.teamId;
    const enemyTeam = matchData.info.participants.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.teamId !== playerTeamId
    );

    // 상대 라이너 찾기 (같은 포지션)
    const positionAliases: Record<string, string> = {
      "BOTTOM": "ADC",
      "BOT": "ADC",
      "UTILITY": "SUPPORT",
      "MIDDLE": "MID",
    };
    
    let playerPosition = playerParticipant.teamPosition || playerParticipant.individualPosition;
    playerPosition = positionAliases[playerPosition] || playerPosition;
    
    const enemyLaner = enemyTeam.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => {
        let enemyPos = p.teamPosition || p.individualPosition;
        enemyPos = positionAliases[enemyPos] || enemyPos;
        return enemyPos === playerPosition;
      }
    );

    const performance = calculateGamePerformance(
      playerParticipant,
      matchData.metadata.matchId,
      playerParticipant.win,
      enemyLaner,
      playerTier,
      matchData.info.gameCreation,
      matchData.info.gameDuration
    );

    return NextResponse.json(performance);
  } catch (error) {
    console.error("Error analyzing game performance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
