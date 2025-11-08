
interface LeagueStatsOverviewProps {
	sport: string;
	summary: {
		totalTeams: number;
		totalGames: number;
		totalGoals: number;
		averageGoalsPerGame: number;
	};
	recentMatches: any[];
	topScoringTeams: any[];
	bestDefensiveTeams: any[];
}

const LeagueStatsOverview = (props: LeagueStatsOverviewProps) => <div>LeagueStatsOverview Stub</div>;
export default LeagueStatsOverview;
