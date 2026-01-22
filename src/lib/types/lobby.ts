export interface LobbyInfo {
	code: string;
	hostName: string;
	playerCount: number;
	maxPlayers: number;
	players: { name: string; isAI: boolean }[];
	createdAt: number;
}
