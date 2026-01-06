"use client";

import { useState } from "react";
import PlayerSearch from "@/components/PlayerSearch";
import TeamBuilder from "@/components/TeamBuilder";

export default function Home() {
	const [activeTab, setActiveTab] = useState<"search" | "team">("search");

	return (
		<div className="min-h-screen bg-gray-100">
			<div className="max-w-6xl mx-auto px-4 py-8">
				{/* 헤더 */}
				<header className="text-center mb-12 bg-white p-8 rounded-lg shadow">
					<h1 className="text-5xl font-bold text-gray-900 mb-2">
						Clutch
					</h1>
					<p className="text-gray-600">
						내전 팀 구성기
					</p>
				</header>

				{/* 탭 네비게이션 */}
				<div className="flex gap-4 mb-8 justify-center">
					<button
						onClick={() => setActiveTab("search")}
						className={`px-6 py-3 rounded-lg font-semibold transition ${
							activeTab === "search"
								? "bg-gray-900 text-white"
								: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
						}`}
					>
						플레이어 검색
					</button>
					<button
						onClick={() => setActiveTab("team")}
						className={`px-6 py-3 rounded-lg font-semibold transition ${
							activeTab === "team"
								? "bg-gray-900 text-white"
								: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
						}`}
					>
						팀 구성
					</button>
				</div>

				{/* 컨텐츠 */}
				<div className="bg-white rounded-lg shadow p-8">
					{activeTab === "search" && <PlayerSearch />}
					{activeTab === "team" && <TeamBuilder />}
				</div>
			</div>
		</div>
	);
}
