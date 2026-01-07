// 플레이어 타입
export interface Player {
  id: string;
  name: string;
  tag: string; // 라이엇 태그 (예: "#KR1")
  tier: string; // IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER
  rank: number; // 1-4
  lp: number; // LP (0-100)
  rating: number; // 계산된 레이팅 스코어 (티어 기반)
  adjustedRating?: number; // 최근 성과 반영된 조정 레이팅
  isUnranked?: boolean; // 언랭크 여부
  mainPosition?: string; // 주 포지션 (TOP, JUNGLE, MID, ADC, SUPPORT)
  subPosition?: string; // 부 포지션
  region: string; // KR, NA, EU 등
  profileIconId: number;
  mostChampions?: Array<{
    championId: number;
    championName: string;
    championLevel: number;
    championPoints: number;
  }>;
}

// 게임 성과 타입
export interface GamePerformance {
  matchId: string;
  position: string; // TOP, JUNGLE, MID, ADC, SUPPORT
  kills: number;
  deaths: number;
  assists: number;
  cs: number; // 크립 스코어
  gold: number; // 획득 골드
  damageDealt: number; // 딜링
  damageTaken: number; // 받은 피해
  objectives: number; // 오브젝티브 획득 (킬+어시스트)
  win: boolean;
  enemyTeamTier: string; // 상대팀 평균 티어
  gameTimestamp: number;
  performanceScore: number; // 최종 성과 점수 (0-100)
  scoreBreakdown?: {
    baseScore: number;
    winAdjusted: number;
    tierBonus: number;
    final: number;
    details: Record<string, number>;
    supportStats?: {
      wards?: number;
      vision?: number;
    };
    enemyStats?: {
      cs: number;
      gold: number;
      damage: number;
      damageTaken?: number;
      kills: number;
      deaths: number;
      assists: number;
      wards?: number;
      vision?: number;
    };
  };
}

// 팀 타입
export interface Team {
  id: string;
  name: string;
  players: Player[];
  totalRating: number;
  avgRating: number;
  createdAt: string;
  type: "2v2" | "3v3" | "4v4" | "5v5" | "tournament";
  captainId?: string; // 지정된 팀 대표 (없으면 자동 배정)
  positionAssignments?: { [playerId: string]: string }; // 플레이어별 포지션 배정
}

// 토너먼트 타입
export interface Tournament {
  id: string;
  name: string;
  teams: Team[];
  bracket: BracketMatch[];
  createdAt: string;
}

export interface BracketMatch {
  id: string;
  team1: Team | null;
  team2: Team | null;
  winner: Team | null;
  round: number;
}

// 라이엇 API 응답 타입
export interface RiotSummonerData {
  id: string;
  puuid: string;
  name: string;
  profileIconId: number;
}

export interface RiotLeagueData {
  summonerId: string;
  summonerName: string;
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

// 라이엇 매치 데이터
export interface RiotMatchData {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: RiotParticipant[];
    platformId: string;
    queueId: number;
    teams: RiotTeamData[];
    tournamentCode: string;
  };
}

export interface RiotParticipant {
  allInPings: number;
  assistMePings: number;
  assists: number;
  baronKills: number;
  basicPings: number;
  bountyLevel: number;
  champExperience: number;
  champLevel: number;
  championId: number;
  championName: string;
  championTransform: number;
  commandPings: number;
  consumablesPurchased: number;
  damageDealtToBuildings: number;
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;
  damageSelfMitigated: number;
  deaths: number;
  detectorWardsPlaced: number;
  doubleKills: number;
  dragonKills: number;
  eligibleForProgression: boolean;
  enemyMissingPings: number;
  enemyVisionPings: number;
  firstBloodAssist: boolean;
  firstBloodKill: boolean;
  firstTowerAssist: boolean;
  firstTowerKill: boolean;
  gameEndedInEarlySurrender: boolean;
  gameEndedInSurrender: boolean;
  goldEarned: number;
  goldSpent: number;
  individualPosition: string;
  inhibitorKills: number;
  inhibitorTakedowns: number;
  inhibitorsLost: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  itemsPurchased: number;
  killingSprees: number;
  kills: number;
  kda: number;
  lane: string;
  largestCriticalStrike: number;
  largestKillingSpree: number;
  largestMultiKill: number;
  longestTimeSpentLiving: number;
  magicDamageDealt: number;
  magicDamageDealtToChamps: number;
  magicDamageTaken: number;
  minionsKilled: number;
  missingPings: number;
  neutralMinionsKilled: number;
  nexusKills: number;
  nexusTakedowns: number;
  nextToKill: number;
  objectivesStolen: number;
  objectivesStolenAssists: number;
  onMyWayPings: number;
  participantId: number;
  playerAugment1: number;
  playerAugment2: number;
  playerAugment3: number;
  playerAugment4: number;
  playerSubteamId: number;
  professionalData: Record<string, unknown> | null;
  pushPings: number;
  puuid: string;
  quadraKills: number;
  riotIdGameName: string;
  riotIdTagline: string;
  role: string;
  sightWardsBoughtInGame: number;
  spell1Casts: number;
  spell2Casts: number;
  spell3Casts: number;
  spell4Casts: number;
  summoner1Casts: number;
  summoner1Id: number;
  summoner2Casts: number;
  summoner2Id: number;
  summonerLevel: number;
  summonerId: string;
  summonerName: string;
  teamEarlySurrendered: boolean;
  teamId: number;
  teamPosition: string;
  timeCCingOthers: number;
  timePlayed: number;
  totalDamageDealt: number;
  totalDamageDealtToChamps: number;
  totalDamageTaken: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  totalMinionsKilled: number;
  totalTimeCCDealt: number;
  totalUnitsHealed: number;
  tripleKills: number;
  trueDamageDealt: number;
  trueDamageDealtToChamps: number;
  trueDamageTaken: number;
  turretKills: number;
  turretTakedowns: number;
  turretsLost: number;
  unrealKills: number;
  visionScore: number;
  visionWardsBoughtInGame: number;
  wardsKilled: number;
  wardsPlaced: number;
  win: boolean;
}

export interface RiotTeamData {
  teamId: number;
  win: boolean;
  bans: Array<{ championId: number; pickTurn: number }>;
  objectives: {
    baron: { kills: number; first: boolean };
    champion: { kills: number; first: boolean };
    dragon: { kills: number; first: boolean };
    inhibitor: { kills: number; first: boolean };
    riftHerald: { kills: number; first: boolean };
    tower: { kills: number; first: boolean };
  };
}
