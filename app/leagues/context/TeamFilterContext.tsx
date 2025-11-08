import { createContext, useContext } from 'react';

type TeamFilterContextType = {
  selectedTeamId?: string;
};

export const TeamFilterContext = createContext<TeamFilterContextType>({});
export function useTeamFilter() { return useContext(TeamFilterContext); }
export function TeamFilterProvider({ children }: { children: React.ReactNode }) {
  return <TeamFilterContext.Provider value={{ selectedTeamId: undefined }}>{children}</TeamFilterContext.Provider>;
}
