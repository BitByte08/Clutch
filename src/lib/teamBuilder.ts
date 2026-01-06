import { Player, Team } from "@/types";

// 포지션 목록
const POSITIONS = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

// 포지션 배정 알고리즘
function assignPositions(players: Player[], teamSize: number): { [playerId: string]: string } {
  const assignments: { [playerId: string]: string } = {};
  
  // 5v5가 아닌 경우 포지션 배정 안 함
  if (teamSize !== 5) {
    return assignments;
  }

  const availablePositions = [...POSITIONS];
  const assignedPlayers = new Set<string>();

  // 1단계: 메인 포지션 우선 배정
  for (const player of players) {
    if (player.mainPosition && availablePositions.includes(player.mainPosition)) {
      assignments[player.id] = player.mainPosition;
      availablePositions.splice(availablePositions.indexOf(player.mainPosition), 1);
      assignedPlayers.add(player.id);
    }
  }

  // 2단계: 서브 포지션 배정
  for (const player of players) {
    if (!assignedPlayers.has(player.id) && player.subPosition && availablePositions.includes(player.subPosition)) {
      assignments[player.id] = player.subPosition;
      availablePositions.splice(availablePositions.indexOf(player.subPosition), 1);
      assignedPlayers.add(player.id);
    }
  }

  // 3단계: 남은 포지션 랜덤 배정
  for (const player of players) {
    if (!assignedPlayers.has(player.id) && availablePositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      const position = availablePositions[randomIndex];
      assignments[player.id] = position;
      availablePositions.splice(randomIndex, 1);
      assignedPlayers.add(player.id);
    }
  }

  return assignments;
}

// 랜덤한 팀 구성 (밸런스 고려)
export function buildBalancedTeams(
  players: Player[],
  teamSize: 2 | 3 | 4 | 5,
  numberOfTeams: number = 2
): Team[] {
  if (players.length < teamSize * numberOfTeams) {
    throw new Error(
      `Not enough players. Need at least ${teamSize * numberOfTeams} players for ${numberOfTeams} ${teamSize}v${teamSize} teams.`
    );
  }

  // 플레이어를 조정된 레이팅 순으로 정렬 (없으면 티어 레이팅 사용)
  const sortedPlayers = [...players].sort((a, b) => {
    const ratingA = a.adjustedRating ?? a.rating;
    const ratingB = b.adjustedRating ?? b.rating;
    return ratingB - ratingA;
  });

  // 팀 초기화
  const teams: Player[][] = Array.from({ length: numberOfTeams }, () => []);

  // 필요한 플레이어만 선택
  const selectedPlayers = sortedPlayers.slice(0, teamSize * numberOfTeams);

  // 뱀 방식 드래프트 (Snake Draft)
  let currentTeam = 0;
  let direction = 1; // 1: 정방향, -1: 역방향

  selectedPlayers.forEach((player, index) => {
    teams[currentTeam].push(player);
    
    // 다음 팀으로 이동
    if ((index + 1) % numberOfTeams === 0) {
      // 방향 전환
      direction *= -1;
    } else {
      currentTeam += direction;
    }
  });

  // 팀 객체로 변환
  const result: Team[] = teams.map((teamPlayers, index) => {
    const totalRating = teamPlayers.reduce((sum, p) => sum + (p.adjustedRating ?? p.rating), 0);
    const avgRating = totalRating / teamPlayers.length;
    
    return {
      id: `team-${Date.now()}-${index}`,
      name: `Team ${index + 1}`,
      players: teamPlayers,
      totalRating,
      avgRating,
      createdAt: new Date().toISOString(),
      type: `${teamSize}v${teamSize}` as "2v2" | "3v3" | "4v4" | "5v5",
      positionAssignments: assignPositions(teamPlayers, teamSize),
    };
  });

  return result;
}

// 팀의 밸런스 점수 계산 (낮을수록 밸런스 좋음)
export function calculateBalanceScore(teams: Team[]): number {
  const avgRatings = teams.map((team) => team.avgRating);
  const overallAvg =
    avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length;

  const variance = avgRatings.reduce(
    (sum, rating) => sum + Math.pow(rating - overallAvg, 2),
    0
  );

  return Math.sqrt(variance / avgRatings.length);
}

// 최적 팀 구성 찾기 (여러 번 시도)
export function findOptimalTeams(
  players: Player[],
  teamSize: 2 | 3 | 4 | 5,
  numberOfTeams: number = 2,
  iterations: number = 100
): Team[] {
  let bestTeams = buildBalancedTeams(players, teamSize, numberOfTeams);
  let bestScore = calculateBalanceScore(bestTeams);

  for (let i = 0; i < iterations; i++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const teams = buildBalancedTeams(shuffled, teamSize, numberOfTeams);
    const score = calculateBalanceScore(teams);

    if (score < bestScore) {
      bestScore = score;
      bestTeams = teams;
    }
  }

  return bestTeams;
}
