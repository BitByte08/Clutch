"use client";

import { useEffect, useState } from "react";
import { loadPlayers } from "@/lib/storage";
import { findOptimalTeams } from "@/lib/teamBuilder";
import { Player, Team } from "@/types";

export default function TeamBuilder() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSize, setTeamSize] = useState<2 | 3 | 4 | 5>(5);
  const [numberOfTeams, setNumberOfTeams] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [captainSelections, setCaptainSelections] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setPlayers(loadPlayers());
  }, []);

  useEffect(() => {
    // 팀 개수가 바뀌면 캡틴 선택 배열 길이를 맞춤
    setCaptainSelections((prev) =>
      Array.from({ length: numberOfTeams }, (_, idx) => prev[idx] ?? "")
    );
  }, [numberOfTeams]);

  const handleBuildTeams = () => {
    const currentPlayers = loadPlayers();
    setPlayers(currentPlayers);

    if (currentPlayers.length < teamSize * numberOfTeams) {
      setError(
        `최소 ${teamSize * numberOfTeams}명의 플레이어가 필요합니다. (현재: ${currentPlayers.length}명)`
      );
      return;
    }

    try {
      const captainIds = captainSelections.some((id) => id) ? captainSelections : undefined;
      const newTeams = findOptimalTeams(
        currentPlayers,
        teamSize,
        numberOfTeams,
        50,
        captainIds
      );
      setTeams(newTeams);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "팀 구성에 실패했습니다."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 팀 구성 설정 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">팀 구성 설정</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              팀 사이즈
            </label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(parseInt(e.target.value) as 2 | 3 | 4 | 5)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="2">2v2</option>
              <option value="3">3v3</option>
              <option value="4">4v4</option>
              <option value="5">5v5</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              팀 개수
            </label>
            <select
              value={numberOfTeams}
              onChange={(e) => setNumberOfTeams(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="2">2팀</option>
              <option value="3">3팀</option>
              <option value="4">4팀</option>
              <option value="5">5팀</option>
            </select>
          </div>
        </div>

        {/* 팀 대표 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {Array.from({ length: numberOfTeams }).map((_, idx) => {
            const alreadyChosen = captainSelections
              .map((id, i) => (i === idx ? undefined : id))
              .filter((id): id is string => Boolean(id));
            const availablePlayers = players.filter(
              (p) => !alreadyChosen.includes(p.id)
            );

            return (
              <div key={`captain-${idx}`}>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  팀 {idx + 1} 대표 (선택 시 고정 배정)
                </label>
                <select
                  value={captainSelections[idx] ?? ""}
                  onChange={(e) => {
                    const next = [...captainSelections];
                    next[idx] = e.target.value;
                    setCaptainSelections(next);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">자동 배정</option>
                  {availablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}#{p.tag} · {p.mainPosition || "포지션 미정"}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleBuildTeams}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition"
        >
          팀 구성하기
        </button>
      </div>

      {/* 생성된 팀 목록 */}
      {teams.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">생성된 팀</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teams.map((team) => (
              <div
                key={team.id}
                className="border-2 border-gray-400 rounded-lg p-4 bg-gray-50"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {team.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div>
                      <span className="font-bold text-gray-900">총 레이팅:</span>{" "}
                      <span className="font-bold text-blue-700">{team.totalRating.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">평균 레이팅:</span>{" "}
                      <span className="font-bold text-blue-700">{team.avgRating.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {team.players.map((player, pIndex) => {
                    const assignedPosition = team.positionAssignments?.[player.id];
                    const isPreferred = assignedPosition === player.mainPosition || assignedPosition === player.subPosition;
                    
                    return (
                      <div
                        key={player.id}
                        className="bg-white p-3 rounded border-l-4 border-gray-600"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900">
                                {pIndex + 1}. {player.name}#{player.tag}
                              </p>
                              {team.captainId === player.id && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white">
                                  대표
                                </span>
                              )}
                              {assignedPosition && (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  isPreferred 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-400 text-white'
                                }`}>
                                  {assignedPosition}
                                </span>
                              )}
                            </div>
                            {player.mostChampions && player.mostChampions.length > 0 && (
                              <p className="text-xs text-gray-700 mt-0.5">
                                모스트: {player.mostChampions.slice(0, 3).map(c => c.championName).join(', ')}
                              </p>
                            )}
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {player.tier} {player.rank} · {player.lp}LP
                            </p>
                            {player.adjustedRating !== undefined && (
                              <p className="text-xs text-blue-700 font-bold mt-1">
                                조정 레이팅: {player.adjustedRating.toFixed(1)}
                              </p>
                            )}
                            {player.mainPosition && (
                              <p className="text-xs text-gray-800 mt-1">
                                선호: {player.mainPosition}{player.subPosition ? ` / ${player.subPosition}` : ''}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {player.adjustedRating !== undefined ? (
                              <>
                                <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold block">
                                  {player.adjustedRating.toFixed(1)}
                                </span>
                                <span className="text-xs text-gray-800 mt-1 block font-semibold">
                                  (티어: {player.rating.toFixed(1)})
                                </span>
                              </>
                            ) : (
                              <span className="bg-gray-600 text-white px-3 py-1 rounded text-sm font-bold">
                                {player.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
