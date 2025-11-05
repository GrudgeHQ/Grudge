# Global Team Filter Feature

## Overview
A global team filter has been implemented in the navigation bar that persists across all pages of the application. When a user selects a specific team, all data throughout the app (Dashboard, Matches, Assignments, and Notifications) will be filtered to show only information related to that team.

## Implementation Details

### 1. Context Provider (`app/context/TeamFilterContext.tsx`)
- React Context that manages the global team filter state
- Persists selection to localStorage for user convenience
- Provides `selectedTeamId` and `setSelectedTeamId` to all components

### 2. Team Filter Selector (`app/components/TeamFilterSelector.tsx`)
- Client component displayed in the navigation bar (top-left after logo)
- Dropdown showing "All Teams" or specific team names
- Auto-loads user's teams from API
- Shows team sport as additional context

### 3. Root Layout (`app/layout.tsx`)
- Wraps entire app with `TeamFilterProvider`
- Ensures filter state is available everywhere

### 4. Navigation Bar (`app/components/NavBar.tsx`)
- Includes `TeamFilterSelector` component
- Positioned prominently in top-left for easy access

## Filtered Pages

### Dashboard (`app/dashboard/page.tsx` + `app/components/DashboardClient.tsx`)
- When "All Teams" selected: Shows all teams with ability to create/join teams
- When specific team selected: Shows detailed team view with:
  - Team info (name, sport, role, invite code)
  - Pending assignments alert
  - Upcoming matches (next 3)
  - Recent results (last 3)
  - Quick navigation links

### Matches (`app/matches/page.tsx`)
- Filters match list by selected team
- Shows team name on cards when "All Teams" is selected
- Displays active filter indicator
- Separates into Upcoming and Past sections

### Assignments (`app/assignments/page.tsx`)
- Filters assignments by team
- Organizes into Pending and Confirmed sections
- Shows active filter indicator
- Enhanced visual hierarchy with color coding

### Notifications (`app/notifications/page.tsx` + `app/components/NotificationsListClient.tsx`)
- Filters notifications by checking `payload.teamId`
- Shows message when no notifications for selected team
- Updated dark theme styling

## User Experience

1. **Persistent Selection**: Team selection is saved in localStorage and persists across page refreshes
2. **Global Access**: Filter is always visible in the navigation bar
3. **Clear Indication**: Filtered pages show which team is currently selected
4. **Easy Reset**: Select "All Teams" to see everything again
5. **Smart Defaults**: Resets to "All Teams" if selected team no longer exists

## Technical Notes

- Uses React Context API for global state management
- Client-side filtering for optimal performance
- localStorage for persistence
- Automatic cleanup if team membership changes
- Compatible with existing API structure
