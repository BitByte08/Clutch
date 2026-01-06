"use client";

import { useState, useEffect, useRef } from "react";
import { searchPlayer, analyzePlayerRecent } from "@/lib/riotApi";
import { addPlayer, removePlayer, loadPlayers, savePlayers } from "@/lib/storage";
import { Player, GamePerformance } from "@/types";

export default function PlayerSearch() {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [region, setRegion] = useState("kr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [gamePerformances, setGamePerformances] = useState<GamePerformance[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const performanceRef = useRef<HTMLDivElement>(null);

  // 페이지 로드 시 로컬스토리지에서 바로 불러오기
  useEffect(() => {
    setPlayers(loadPlayers());
  }, []);

  // 모든 플레이어 새로고침 (API 호출로 최신 정보 업데이트)
  const handleRefreshAll = async () => {
    setRefreshing(true);
    const currentPlayers = loadPlayers();
    const updatedPlayers: Player[] = [];

    for (const savedPlayer of currentPlayers) {
      const player = await searchPlayer(savedPlayer.name, savedPlayer.tag, savedPlayer.region);
      if (player) {
        // 마스터리 정보 가져오기
        try {
          const masteryResponse = await fetch("/api/riot/mastery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puuid: player.id, region: savedPlayer.region }),
          });
          if (masteryResponse.ok) {
            player.mostChampions = await masteryResponse.json();
          }
        } catch (error) {
          console.error("Failed to fetch mastery:", error);
        }

        // 게임 분석하여 조정된 레이팅 계산
        const performances = await analyzePlayerRecent(player);
        if (performances.length > 0) {
          const avgPerformance = performances.reduce((sum, p) => sum + p.performanceScore, 0) / performances.length;
          player.adjustedRating = player.rating * 0.7 + avgPerformance * 0.3;
        } else {
          // 게임이 없으면 티어 레이팅 그대로 사용
          player.adjustedRating = player.rating;
        }
        updatedPlayers.push(player);
      }
    }

    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
    setRefreshing(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name || !tag) {
      setError("소환사 이름과 태그를 입력해주세요");
      setLoading(false);
      return;
    }

    // 중복 체크
    const existingPlayers = loadPlayers();
    const isDuplicate = existingPlayers.some(
      (p) => p.name.toLowerCase() === name.toLowerCase() && 
             p.tag.toLowerCase() === tag.toLowerCase() && 
             p.region === region
    );

    if (isDuplicate) {
      setError("이미 추가된 플레이어입니다.");
      setLoading(false);
      return;
    }

    const player = await searchPlayer(name, tag, region);

    if (player) {
      // 마스터리 정보 가져오기
      try {
        const masteryResponse = await fetch("/api/riot/mastery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puuid: player.id, region }),
        });
        if (masteryResponse.ok) {
          player.mostChampions = await masteryResponse.json();
        }
      } catch (error) {
        console.error("Failed to fetch mastery:", error);
      }

      // 게임 분석하여 조정된 레이팅 계산
      const performances = await analyzePlayerRecent(player);
      if (performances.length > 0) {
        const avgPerformance = performances.reduce((sum, p) => sum + p.performanceScore, 0) / performances.length;
        player.adjustedRating = player.rating * 0.7 + avgPerformance * 0.3;
      } else {
        // 게임이 없으면 티어 레이팅 그대로 사용 (언랭 포함)
        player.adjustedRating = player.rating;
      }
      
      addPlayer(player);
      setPlayers(loadPlayers());
      setName("");
      setTag("");
      setError("");
      setSelectedPlayer(player);
      setGamePerformances(performances);
      
      // 최근 게임 성과 섹션으로 스크롤
      setTimeout(() => {
        performanceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      setError("플레이어를 찾을 수 없습니다. 이름과 태그를 확인해주세요.");
    }

    setLoading(false);
  };

  const loadGamePerformance = async (player: Player) => {
    setPerformanceLoading(true);
    const performances = await analyzePlayerRecent(player);
    setGamePerformances(performances);
    
    setPerformanceLoading(false);
  };

  const handleRemovePlayer = (playerId: string) => {
    removePlayer(playerId);
    setPlayers(loadPlayers());
  };

  const handleSelectPlayer = async (player: Player) => {
    setSelectedPlayer(player);
    await loadGamePerformance(player);
    
    // 최근 게임 성과 섹션으로 스크롤
    setTimeout(() => {
      performanceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleUpdatePlayerTier = (playerId: string, newTier: string) => {
    const currentPlayers = loadPlayers();
    const updatedPlayers = currentPlayers.map(p => {
      if (p.id === playerId) {
        const tierPoints: Record<string, number> = {
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
        const rankPoints: Record<number, number> = { 1: 2.5, 2: 1.75, 3: 1.0, 4: 0.25 };
        const baseRating = tierPoints[newTier] + rankPoints[p.rank] + p.lp / 100;
        const newRating = Math.min(100, Math.max(0, baseRating));
        // 조정 레이팅도 함께 업데이트 (언랭이 티어 변경하면 adjustedRating도 설정)
        return { ...p, tier: newTier, rating: newRating, adjustedRating: newRating };
      }
      return p;
    });
    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
  };

  const handleUpdatePlayerRank = (playerId: string, newRank: number) => {
    const currentPlayers = loadPlayers();
    const updatedPlayers = currentPlayers.map(p => {
      if (p.id === playerId) {
        const tierPoints: Record<string, number> = {
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
        const rankPoints: Record<number, number> = { 1: 2.5, 2: 1.75, 3: 1.0, 4: 0.25 };
        const baseRating = tierPoints[p.tier] + rankPoints[newRank] + p.lp / 100;
        const newRating = Math.min(100, Math.max(0, baseRating));
        // 조정 레이팅도 함께 업데이트
        return { ...p, rank: newRank, rating: newRating, adjustedRating: newRating };
      }
      return p;
    });
    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
  };

  const handleUpdatePosition = (playerId: string, positionType: 'main' | 'sub', position: string) => {
    const currentPlayers = loadPlayers();
    const updatedPlayers = currentPlayers.map(p => {
      if (p.id === playerId) {
        if (positionType === 'main') {
          return { ...p, mainPosition: position };
        } else {
          return { ...p, subPosition: position };
        }
      }
      return p;
    });
    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
  };

  const getTierColor = (tier: string): string => {
    const colors: Record<string, string> = {
      IRON: "text-gray-600",
      BRONZE: "text-amber-700",
      SILVER: "text-gray-400",
      GOLD: "text-yellow-500",
      PLATINUM: "text-cyan-500",
      EMERALD: "text-emerald-500",
      DIAMOND: "text-blue-500",
      MASTER: "text-purple-600",
      GRANDMASTER: "text-red-600",
      CHALLENGER: "text-yellow-400",
    };
    return colors[tier] || "text-gray-900";
  };

  const getUpdatedPlayerRating = (player: Player): number => {
    if (gamePerformances.length === 0) {
      return player.rating;
    }

    const avgPerformance =
      gamePerformances.reduce((sum, p) => sum + p.performanceScore, 0) /
      gamePerformances.length;

    // 70% 티어 기반 + 30% 최근 게임
    return player.rating * 0.7 + avgPerformance * 0.3;
  };

  return (
    <div className="space-y-6">
      {/* 로딩 스플래시 */}
      {(loading || refreshing) && (
        <div className="fixed inset-0 min-h-screen bg-black/30 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md w-full mx-4">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-gray-900 mx-auto mb-6"></div>
            <p className="text-2xl font-bold text-gray-900 mb-3">
              {loading ? "플레이어 검색 중..." : "전체 새로고침 중..."}
            </p>
            <p className="text-sm text-gray-600">
              {loading ? "최근 게임을 분석하고 있습니다" : "모든 플레이어 정보를 업데이트하는 중입니다"}
            </p>
          </div>
        </div>
      )}

      {/* 플레이어 검색 폼 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">플레이어 검색</h2>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                소환사 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: Hide on bush"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                태그 (# 제외)
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="예: KR1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              지역
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
            >
              <option value="kr">한국 (KR)</option>
              <option value="na">북미 (NA)</option>
              <option value="euw">유럽 (EUW)</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? "검색 중..." : "플레이어 검색"}
          </button>
        </form>
      </div>

      {/* 추가된 플레이어 목록 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            추가된 플레이어 ({players.length})
          </h2>
          {players.length > 0 && (
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {refreshing ? "새로고침 중..." : "🔄 모두 새로고침"}
            </button>
          )}
        </div>
        {players.length === 0 ? (
          <p className="text-gray-500">아직 플레이어를 추가하지 않았습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="border border-gray-300 rounded-lg p-4 bg-gray-50 hover:shadow transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {player.name}#{player.tag}
                    </h3>
                    <p className="text-sm text-gray-600">{player.region}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlayer(player.id);
                    }}
                    className="text-gray-600 hover:text-gray-900 font-semibold"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-semibold text-gray-900">등급:</span> 
                    {player.isUnranked ? (
                      <span className="ml-1 text-orange-600 font-bold">언랭크</span>
                    ) : (
                      <span className={`ml-1 font-bold text-lg ${getTierColor(player.tier)}`}>
                        {player.tier} <span className="text-gray-900 font-semibold">{player.rank}</span>
                      </span>
                    )}
                  </p>
                  {player.isUnranked && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-2 space-y-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          예상 티어 선택:
                        </label>
                        <select
                          value={player.tier}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdatePlayerTier(player.id, e.target.value);
                          }}
                          className="w-full px-2 py-1 text-xs border border-orange-300 rounded text-gray-900 font-semibold"
                        >
                          <option value="IRON">IRON</option>
                          <option value="BRONZE">BRONZE</option>
                          <option value="SILVER">SILVER</option>
                          <option value="GOLD">GOLD</option>
                          <option value="PLATINUM">PLATINUM</option>
                          <option value="EMERALD">EMERALD</option>
                          <option value="DIAMOND">DIAMOND</option>
                          <option value="MASTER">MASTER</option>
                          <option value="GRANDMASTER">GRANDMASTER</option>
                          <option value="CHALLENGER">CHALLENGER</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          랭크 선택:
                        </label>
                        <select
                          value={player.rank}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdatePlayerRank(player.id, parseInt(e.target.value));
                          }}
                          className="w-full px-2 py-1 text-xs border border-orange-300 rounded text-gray-900 font-semibold"
                        >
                          <option value="1">I (최고)</option>
                          <option value="2">II</option>
                          <option value="3">III</option>
                          <option value="4">IV (최저)</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {!player.isUnranked && (
                    <p>
                      <span className="font-semibold text-gray-900">LP:</span> {player.lp}
                    </p>
                  )}
                  <p className="bg-gray-200 text-gray-900 px-2 py-1 rounded">
                    <span className="font-semibold">티어 레이팅:</span>{" "}
                    {player.rating.toFixed(1)}/100
                  </p>
                  {player.adjustedRating !== undefined && (
                    <p className="bg-blue-100 text-gray-900 px-2 py-1 rounded font-bold">
                      <span className="font-semibold">조정된 레이팅:</span>{" "}
                      {player.adjustedRating.toFixed(1)}/100
                    </p>
                  )}
                  
                  {/* 주/부 포지션 선택 */}
                  <div className="mt-2 pt-2 border-t border-gray-300 space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        주 포지션:
                      </label>
                      <select
                        value={player.mainPosition || ""}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdatePosition(player.id, 'main', e.target.value);
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 font-semibold"
                      >
                        <option value="">선택 안함</option>
                        <option value="TOP">TOP</option>
                        <option value="JUNGLE">JUNGLE</option>
                        <option value="MID">MID</option>
                        <option value="ADC">ADC</option>
                        <option value="SUPPORT">SUPPORT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        부 포지션:
                      </label>
                      <select
                        value={player.subPosition || ""}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleUpdatePosition(player.id, 'sub', e.target.value);
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 font-semibold"
                      >
                        <option value="">선택 안함</option>
                        <option value="TOP">TOP</option>
                        <option value="JUNGLE">JUNGLE</option>
                        <option value="MID">MID</option>
                        <option value="ADC">ADC</option>
                        <option value="SUPPORT">SUPPORT</option>
                      </select>
                    </div>
                  </div>

                  {player.mostChampions && player.mostChampions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs font-semibold text-gray-700 mb-1">모스트 챔피언</p>
                      <div className="space-y-1">
                        {player.mostChampions.map((champ, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-900">
                            <span>🏆 {champ.championName}</span>
                            <span className="font-semibold">Lv.{champ.championLevel} ({(champ.championPoints / 1000).toFixed(0)}k)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 전적 분석 버튼 */}
                  <button
                    onClick={() => handleSelectPlayer(player)}
                    className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm"
                  >
                    📊 전적 분석 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 게임 성과 분석 */}
      {selectedPlayer && (
        <div ref={performanceRef} className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              최근 5판 분석 - {selectedPlayer.name}#{selectedPlayer.tag}
            </h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">조정된 레이팅</p>
              <p className="text-3xl font-bold text-gray-900">
                {getUpdatedPlayerRating(selectedPlayer).toFixed(2)}
              </p>
            </div>
          </div>

          {performanceLoading ? (
            <p className="text-gray-500">게임 데이터를 불러오는 중...</p>
          ) : gamePerformances.length === 0 ? (
            <p className="text-gray-500">게임 데이터를 찾을 수 없습니다.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {gamePerformances.map((perf, idx) => {
                  const score =
                    typeof perf.performanceScore === "number"
                      ? perf.performanceScore
                      : 0;
                  const performanceColor =
                    score >= 80
                      ? "bg-green-50 border-green-300"
                      : score >= 60
                      ? "bg-blue-50 border-blue-300"
                      : score >= 40
                      ? "bg-yellow-50 border-yellow-300"
                      : "bg-red-50 border-red-300";

                  return (
                    <div key={idx}>
                      <div
                        className={`border-2 rounded-lg p-4 ${performanceColor} cursor-pointer hover:shadow-md transition relative`}
                        onClick={() => setExpandedGame(expandedGame === idx ? null : idx)}
                      >
                        <div className="absolute top-2 left-2 bg-gray-900 text-white text-xs px-2 py-1 rounded-full font-bold">
                          게임 {idx + 1}
                        </div>
                        <div className="mb-3 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-900">
                              {perf.position}
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                perf.win
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {perf.win ? "승" : "패"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <p>K/D/A: {perf.kills}/{perf.deaths}/{perf.assists}</p>
                            <p>CS: {perf.cs}</p>
                            <p>딜: {(perf.damageDealt / 1000).toFixed(1)}k</p>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 80
                                ? "bg-green-600"
                                : score >= 60
                                ? "bg-blue-600"
                                : score >= 40
                                ? "bg-yellow-600"
                                : "bg-red-600"
                            }`}
                            style={{
                              width: `${score}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-center font-bold text-gray-900">
                          {score.toFixed(1)}/100
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 선택된 게임의 상세 내역 (전체 너비) */}
              {expandedGame !== null && gamePerformances[expandedGame]?.scoreBreakdown && (
                <div className="w-full p-6 bg-white border-2 border-gray-900 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-gray-900 text-white text-sm px-3 py-1 rounded-full font-bold">
                      게임 {expandedGame + 1}
                    </span>
                    <p className="font-bold text-xl text-gray-900">점수 산출 내역 ({gamePerformances[expandedGame].position})</p>
                  </div>
                  
                  {/* 상대 라이너 비교 */}
                  {gamePerformances[expandedGame].scoreBreakdown.enemyStats && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900 mb-3 text-lg">📊 상대 라이너 비교</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-gray-900">
                          <p className="font-semibold text-blue-600 mb-2">내 스탯</p>
                          <p>K/D/A: {gamePerformances[expandedGame].kills}/{gamePerformances[expandedGame].deaths}/{gamePerformances[expandedGame].assists}</p>
                          <p>CS: {gamePerformances[expandedGame].cs}</p>
                          <p>골드: {gamePerformances[expandedGame].gold.toLocaleString()}</p>
                          <p>딜: {(gamePerformances[expandedGame].damageDealt / 1000).toFixed(1)}k</p>
                          {gamePerformances[expandedGame].position === "SUPPORT" && (
                            <>
                              <p>와드: {gamePerformances[expandedGame].scoreBreakdown.supportStats?.wards ?? 0}</p>
                              <p>시야: {gamePerformances[expandedGame].scoreBreakdown.supportStats?.vision ?? 0}</p>
                            </>
                          )}
                        </div>
                        <div className="text-gray-900">
                          <p className="font-semibold text-red-600 mb-2">상대 스탯</p>
                          <p>K/D/A: {gamePerformances[expandedGame].scoreBreakdown.enemyStats.kills}/{gamePerformances[expandedGame].scoreBreakdown.enemyStats.deaths}/{gamePerformances[expandedGame].scoreBreakdown.enemyStats.assists}</p>
                          <p>CS: {gamePerformances[expandedGame].scoreBreakdown.enemyStats.cs}</p>
                          <p>골드: {gamePerformances[expandedGame].scoreBreakdown.enemyStats.gold.toLocaleString()}</p>
                          <p>딜: {(gamePerformances[expandedGame].scoreBreakdown.enemyStats.damage / 1000).toFixed(1)}k</p>
                          {gamePerformances[expandedGame].position === "SUPPORT" && (
                            <>
                              <p>와드: {gamePerformances[expandedGame].scoreBreakdown.enemyStats.wards || 0}</p>
                              <p>시야: {gamePerformances[expandedGame].scoreBreakdown.enemyStats.vision || 0}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 포지션별 평가 항목 */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-3 text-lg">🎯 평가 항목 ({gamePerformances[expandedGame].position}별 기준)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(gamePerformances[expandedGame].scoreBreakdown.details).map(([key, val]) => {
                        const label = 
                          key === 'csScore' ? 'CS 점수' :
                          key === 'kdaScore' ? 'KDA 점수' :
                          key === 'damageScore' ? '딜 점수' :
                          key === 'goldScore' ? '골드 점수' :
                          key === 'objectiveScore' ? '오브젝트 점수' :
                          key === 'wardScore' ? '와드 점수' :
                          key === 'visionScore' ? '시야 점수' :
                          key;
                        return (
                          <div key={key} className="bg-white p-3 rounded border border-gray-300">
                            <p className="text-sm text-gray-600">{label}</p>
                            <p className="text-2xl font-bold text-gray-900">{val.toFixed(1)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 최종 점수 계산 */}
                  <div className="p-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg border-2 border-gray-300">
                    <div className="space-y-2 text-gray-900">
                      <p className="font-semibold flex justify-between text-lg">
                        <span>기본 점수 (항목 평균):</span>
                        <span>{gamePerformances[expandedGame].scoreBreakdown.baseScore.toFixed(1)}점</span>
                      </p>
                      <p className="font-semibold flex justify-between text-lg">
                        <span>승패 보정:</span>
                        <span className={gamePerformances[expandedGame].win ? "text-green-600" : "text-red-600"}>
                          {gamePerformances[expandedGame].scoreBreakdown.winAdjusted.toFixed(1)}점 ({gamePerformances[expandedGame].win ? "승리" : "패배"})
                        </span>
                      </p>
                      <p className="font-bold text-2xl text-gray-900 flex justify-between mt-3 pt-3 border-t-2 border-gray-400">
                        <span>최종 점수:</span>
                        <span>{gamePerformances[expandedGame].scoreBreakdown.final.toFixed(1)}점</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 평균 성과 */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">
                  평균 성과: {(() => {
                    const scores = gamePerformances.map((p) =>
                      typeof p.performanceScore === "number" ? p.performanceScore : 0
                    );
                    const avg =
                      scores.length === 0
                        ? 0
                        : scores.reduce((sum, v) => sum + v, 0) / scores.length;
                    return avg.toFixed(1);
                  })()}/100
                </p>
              </div>

              {/* 점수 계산 공식 참고 */}
              <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📐 점수 계산 공식 참고</h3>
                
                <div className="space-y-4 text-sm text-gray-900">
                  <div>
                    <p className="font-bold text-base mb-2">1. 기본 점수 (상대 라이너 비교)</p>
                    <div className="pl-4 space-y-1">
                      <p>• <strong>CS 점수</strong> = 50 + (내 CS - 상대 CS) ÷ 2</p>
                      <p>• <strong>골드 점수</strong> = (내 골드 ÷ 상대 골드) × 50</p>
                      <p>• <strong>딜 점수</strong> = (내 딜 ÷ 상대 딜) × 50</p>
                      <p>• <strong>KDA 점수</strong> = (킬 + 어시) ÷ 데스 × 20</p>
                      <p>• <strong>오브젝트 점수</strong> (정글) = (바론×2 + 용×2 + 억제기) × 10</p>
                      <p>• <strong>와드 점수</strong> (서포터) = (내 와드 ÷ 상대 와드) × 50</p>
                      <p>• <strong>시야 점수</strong> (서포터) = (내 시야 ÷ 상대 시야) × 50</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-base mb-2">2. 포지션별 평가 항목</p>
                    <div className="pl-4 space-y-1">
                      <p>• <strong>TOP/MID/ADC</strong>: CS, 골드, 딜, KDA</p>
                      <p>• <strong>JUNGLE</strong>: CS, 딜, KDA, 오브젝트</p>
                      <p>• <strong>SUPPORT</strong>: 와드, 시야, 딜, KDA</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-base mb-2">3. 최종 점수 계산</p>
                    <div className="pl-4 space-y-1">
                      <p>① 기본 점수 = 평가 항목들의 평균</p>
                      <p>② 승패 보정:</p>
                      <p className="pl-4">- 승리: max(70, 기본 점수 × 0.6 + 40)</p>
                      <p className="pl-4">- 패배: min(60, 기본 점수 × 0.8)</p>
                      <p>③ 최종 점수 = 승패 보정 후 점수 (0~100점)</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500">
                    <p className="font-semibold text-blue-900">💡 핵심 원리</p>
                    <p className="text-blue-800 mt-1">
                      모든 스탯은 <strong>상대 라이너와의 비교</strong>로 평가됩니다. 
                      50점 = 상대와 동등, 70점+ = 라인전 우세, 30점- = 라인전 열세
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
