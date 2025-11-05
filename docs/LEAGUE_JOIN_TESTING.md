# League Join Request System - Testing Guide

## Overview
This document outlines the complete testing procedure for the league join request/approval system once the Prisma client generation issue is resolved.

## Prerequisites
- Prisma client must be regenerated successfully (`npx prisma generate`)
- Development server running
- At least two user accounts (one League Manager, one team administrator)
- One league created by the League Manager
- One team created by the team administrator (not in the league)

## Test Scenarios

### Scenario 1: Team Requests to Join League

**Steps:**
1. Login as team administrator
2. Navigate to leagues page (`/leagues`)
3. Find the target league and click "Join League"
4. Verify success message appears
5. Check that direct join is prevented (should create request instead)

**Expected Results:**
- Success message: "Join request sent to League Manager"
- Team is NOT immediately added to league
- League Manager receives notification about the join request

### Scenario 2: League Manager Reviews Join Requests

**Steps:**
1. Login as League Manager
2. Navigate to league detail page (`/leagues/[leagueId]`)
3. Locate "Join Requests" section under League Manager Controls
4. Verify pending request appears with:
   - Team name and sport
   - Team member count
   - Requester information
   - Request timestamp
   - Approve/Deny buttons

**Expected Results:**
- Join request displays correctly with all team information
- Both Approve and Deny buttons are functional
- UI shows loading states during processing

### Scenario 3: League Manager Approves Join Request

**Steps:**
1. In the Join Requests section, click "Approve" on a pending request
2. Verify success message appears
3. Check that request disappears from pending list
4. Navigate to Teams section and verify team is now listed
5. Login as team administrator and check notifications

**Expected Results:**
- Success message: "Join request approved successfully!"
- Request removed from pending list
- Team appears in league's teams list
- Team administrator receives approval notification
- Team now shows league membership in their team view

### Scenario 4: League Manager Denies Join Request

**Steps:**
1. Create another join request from a different team
2. In the Join Requests section, click "Deny" on the request
3. Verify success message appears
4. Check that request disappears from pending list
5. Verify team is NOT added to league
6. Login as team administrator and check notifications

**Expected Results:**
- Success message: "Join request denied successfully!"
- Request removed from pending list
- Team is NOT in league's teams list
- Team administrator receives denial notification

### Scenario 5: Notification System Verification

**Steps:**
1. Complete both approval and denial scenarios above
2. Check notifications for both League Manager and team administrators
3. Verify notification content and timing

**Expected Results:**

**League Manager Notifications:**
- Receive notification when team requests to join
- Notification includes team name and league name
- Links to league management page

**Team Administrator Notifications:**
- Receive notification when request is approved: "Your team [TeamName] has been accepted into the league [LeagueName]"
- Receive notification when request is denied: "Your request to join the league [LeagueName] has been denied"
- Notifications include relevant league and team information

### Scenario 6: Edge Cases and Error Handling

**Test Cases:**
1. **Duplicate Requests**: Team admin tries to join same league twice
2. **Invalid League**: Request to non-existent league
3. **Non-Admin User**: Regular team member tries to request league join
4. **Already Member**: Team admin tries to join league they're already in
5. **League Manager Actions**: Non-League Manager tries to approve/deny requests

**Expected Results:**
- Appropriate error messages for each case
- No system crashes or undefined behavior
- Proper permission validation throughout

## API Endpoints to Test

### POST /api/leagues/join
- **Input**: `{ leagueId: string }`
- **Expected**: Creates LeagueJoinRequest, sends notification to League Manager
- **Error Cases**: Invalid league, already requested, not team admin

### GET /api/leagues/[leagueId]/join-requests
- **Authorization**: League Manager only
- **Expected**: Returns array of pending join requests with team/user info
- **Error Cases**: Not League Manager, invalid league

### POST /api/leagues/[leagueId]/join-requests/[requestId]
- **Input**: `{ action: 'approve' | 'deny' }`
- **Authorization**: League Manager only
- **Expected**: Updates request status, adds team to league (if approved), sends notification
- **Error Cases**: Not League Manager, invalid request, already processed

## Database Verification

After testing, verify the following database states:

**LeagueJoinRequest Table:**
- Approved requests have status 'APPROVED', respondedBy filled, respondedAt timestamp
- Denied requests have status 'DENIED', respondedBy filled, respondedAt timestamp
- No pending requests remain after processing

**LeagueTeam Table:**
- Approved teams appear in league's team list
- Denied teams do NOT appear in league's team list

**Notification Table:**
- League Manager receives notifications for each join request
- Team administrators receive notifications for request outcomes
- All notifications have proper payload structure

## Success Criteria

The system passes testing if:
1. ✅ Teams can request to join leagues (no auto-join)
2. ✅ League Managers receive notifications about requests
3. ✅ League Managers can view pending requests with full team information
4. ✅ League Managers can approve requests (team joins league, gets notified)
5. ✅ League Managers can deny requests (team doesn't join, gets notified)
6. ✅ Proper error handling for all edge cases
7. ✅ All database operations complete correctly
8. ✅ UI provides clear feedback throughout the process

## Known Issues to Address

1. **Prisma Client Generation**: File permission errors preventing client regeneration
2. **Notification Content**: Verify notification payload structure matches UI expectations
3. **UI Polish**: Loading states, error handling, success messages
4. **Performance**: Ensure join request queries are efficient for leagues with many requests

## Next Steps After Testing

1. **Polish UI/UX**: Improve visual feedback and loading states
2. **Add Batch Operations**: Allow League Managers to approve/deny multiple requests
3. **Request Management**: Add ability to cancel/withdraw requests
4. **Notification Enhancements**: Real-time notifications, email notifications
5. **Analytics**: Track league join request patterns and approval rates