"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

export default function Header() {
	const segment = useSelectedLayoutSegment();
	const isPlayers = segment === "players" || segment === null;
	const isTeams = segment === "teams";

	return (
		<header className="text-center mb-12 bg-white p-8 rounded-lg shadow">
			<h1 className="text-5xl font-bold text-gray-900 mb-2">
				Clutch
			</h1>
			<p className="text-gray-600">
				내전 팀 구성기
			</p>

			{/* 네비게이션 */}
			<nav className="flex gap-4 mt-8 justify-center">
				<Link
					href="/players"
					className={`px-6 py-3 rounded-lg font-semibold transition ${
						isPlayers
							? "bg-gray-900 text-white"
							: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
					}`}
				>
					플레이어 검색
				</Link>
				<Link
					href="/teams"
					className={`px-6 py-3 rounded-lg font-semibold transition ${
						isTeams
							? "bg-gray-900 text-white"
							: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
					}`}
				>
					팀 구성
				</Link>
			</nav>
		</header>
	);
}
