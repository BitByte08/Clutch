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
  numberOfTeams: number = 2,
  captainIds?: Array<string | null | undefined>
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

  // 캡틴 목록 준비 (중복 제거, 최대 팀 수만큼 사용)
  const playerMap = new Map(sortedPlayers.map((p) => [p.id, p]));
  const uniqueCaptains: Player[] = [];
  const seenCaptainIds = new Set<string>();
  (captainIds ?? []).forEach((id) => {
    if (!id) return;
    if (seenCaptainIds.has(id)) return;
    const player = playerMap.get(id);
    if (!player) return;
    seenCaptainIds.add(id);
    if (uniqueCaptains.length < numberOfTeams) {
      uniqueCaptains.push(player);
    }
  });

  // 필요한 플레이어만 선택 (캡틴 우선 포함 후 상위 레이팅으로 채움)
  const capacity = teamSize * numberOfTeams;
  const selectedPlayers: Player[] = [...uniqueCaptains];
  for (const p of sortedPlayers) {
    if (selectedPlayers.length >= capacity) break;
    if (seenCaptainIds.has(p.id)) continue;
    selectedPlayers.push(p);
  }

  if (selectedPlayers.length < capacity) {
    throw new Error(
      `Not enough players. Need at least ${capacity} players to honor captain choices.`
    );
  }

  // 팀 초기화
  const teams: Player[][] = Array.from({ length: numberOfTeams }, () => []);

  // 캡틴을 우선 배정 (index 기준으로 매칭)
  const captainOrder: Array<Player | undefined> = Array.from({ length: numberOfTeams }, (_, idx) => uniqueCaptains[idx]);
  const captainIdSet = new Set<string>(uniqueCaptains.map((c) => c.id));
  captainOrder.forEach((captain, idx) => {
    if (captain) {
      teams[idx].push(captain);
    }
  });

  // 남은 플레이어 풀 (캡틴 제거)
  let remainingPlayers = selectedPlayers.filter((p) => !captainIdSet.has(p.id));

  // 드래프트 순서를 입력 players 배열의 순서에 맞춰 정렬해 랜덤성 부여
  // findOptimalTeams 에서 players 를 매 반복마다 섞어 전달하므로, 여기서 그 순서를 반영
  const orderIndex = new Map(players.map((p, i) => [p.id, i]));
  remainingPlayers = remainingPlayers.sort((a, b) => {
    const ai = orderIndex.get(a.id) ?? 0;
    const bi = orderIndex.get(b.id) ?? 0;
    return ai - bi;
  });

  // 뱀 방식 드래프트 (Snake Draft)
  let currentTeam = 0;
  let direction = 1; // 1: 정방향, -1: 역방향

  let picksMade = 0;
  remainingPlayers.forEach((player) => {
    // 현재 팀이 가득 찼으면 다음 가능한 팀으로 이동
    let safety = 0;
    while (teams[currentTeam].length >= teamSize && safety < numberOfTeams) {
      currentTeam += direction;
      safety += 1;
      if (currentTeam >= numberOfTeams || currentTeam < 0) {
        direction *= -1;
        currentTeam += direction;
      }
    }

    teams[currentTeam].push(player);
    picksMade += 1;

    // 다음 팀으로 이동 (스네이크 드래프트 유지)
    if (picksMade % numberOfTeams === 0) {
      direction *= -1;
    } else {
      currentTeam += direction;
    }

    if (currentTeam >= numberOfTeams || currentTeam < 0) {
      direction *= -1;
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
      captainId: captainOrder[index]?.id,
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
  iterations: number = 100,
  captainIds?: Array<string | null | undefined>
): Team[] {
  let bestTeams = buildBalancedTeams(players, teamSize, numberOfTeams, captainIds);
  let bestScore = calculateBalanceScore(bestTeams);

  for (let i = 0; i < iterations; i++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const teams = buildBalancedTeams(shuffled, teamSize, numberOfTeams, captainIds);
    const score = calculateBalanceScore(teams);

    if (score < bestScore) {
      bestScore = score;
      bestTeams = teams;
    }
  }

  return bestTeams;
}
