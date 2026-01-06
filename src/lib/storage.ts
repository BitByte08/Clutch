import { Player, Team } from "@/types";

const PLAYERS_STORAGE_KEY = "lol-team-builder:players";
const TEAMS_STORAGE_KEY = "lol-team-builder:teams";

// 클라이언트 사이드 함수들
// 플레이어 저장
export function savePlayers(players: Player[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
  }
}

// 플레이어 조회
export function loadPlayers(): Player[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(PLAYERS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 플레이어 추가
export function addPlayer(player: Player): void {
  const players = loadPlayers();
  const existingIndex = players.findIndex((p) => p.id === player.id);
  if (existingIndex >= 0) {
    // 기존 플레이어 업데이트
    players[existingIndex] = player;
  } else {
    // 새 플레이어 추가
    players.push(player);
  }
  savePlayers(players);
}

// 플레이어 제거
export function removePlayer(playerId: string): void {
  const players = loadPlayers().filter((p) => p.id !== playerId);
  savePlayers(players);
}

// 팀 저장
export function saveTeams(teams: Team[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  }
}

// 팀 조회
export function loadTeams(): Team[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(TEAMS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 팀 추가 (여러 개)
export function addTeams(teams: Team[]): void {
  const existingTeams = loadTeams();
  const allTeams = [...existingTeams, ...teams];
  saveTeams(allTeams);
}

// 팀 제거
export function removeTeam(teamId: string): void {
  const teams = loadTeams().filter((t) => t.id !== teamId);
  saveTeams(teams);
}

// 모든 데이터 초기화
export function clearAllData(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PLAYERS_STORAGE_KEY);
    localStorage.removeItem(TEAMS_STORAGE_KEY);
  }
}

