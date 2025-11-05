# Grudge Tournament Partnership Rotation System

## Overview
The grudge tournament system now includes complete partnership rotation to ensure players exhaust ALL possible partnerships before repeating any pairing. This creates the most engaging and fair tournament experience by maximizing partnership variety.

## Key Features

### 1. Complete Partnership Tracking
- The system tracks ALL partnerships across ALL rounds of the tournament
- Ensures players pair with completely new partners before repeating any previous partnerships
- Uses exponential scoring to heavily penalize repeated partnerships (0, 10, 100, 1000+ points for 0, 1, 2, 3+ uses)
- Maintains comprehensive partnership usage statistics throughout the tournament

### 2. Linked Groups Exception
- Players in linked groups are allowed to play together repeatedly
- Linked groups take priority in team formation
- The partnership avoidance rule doesn't apply within linked groups

### 3. Sit-Out Rotation
- Players who sat out in the previous round get priority for playing
- Fair rotation ensures everyone gets similar playing time over multiple rounds

### 4. Advanced Team Formation Optimization
The algorithm uses a sophisticated scoring approach to find optimal team combinations:
- Tries up to 50 different team combinations per round
- Calculates partnership scores based on historical usage (heavily penalizes repeats)
- Prioritizes completely new partnerships (score 0) over any repeated partnerships
- Falls back to least-repeated partnerships if no completely new combinations exist

## Algorithm Flow

### Round Generation Process:
1. **Process Linked Groups First**
   - Place linked groups into teams (they can repeat partnerships)
   - Find opponents for linked group teams

2. **Individual Player Assignment**
   - Prioritize players who sat out in the previous round
   - Try multiple team combinations to minimize repeated partnerships
   - Select the best combination (fewest repeated partnerships)

3. **Partnership Optimization**
   - Calculate optimal partnerships based on historical usage across all rounds
   - Update comprehensive partnership usage statistics after each round
   - Exclude linked group partnerships from rotation penalties while still tracking usage

### Example Scenarios

### Scenario 1: Complete Partnership Exhaustion (4 players, 2v2)
```
Round 1: Team A (Player1, Player2) vs Team B (Player3, Player4)
Round 2: Team A (Player1, Player3) vs Team B (Player2, Player4)  
Round 3: Team A (Player1, Player4) vs Team B (Player2, Player3)
Round 4: Team A (Player1, Player2) vs Team B (Player3, Player4) [Now all partnerships used once]
```
Result: All 6 possible partnerships exhausted before any repetition

### Scenario 2: Linked Groups
```
Players 1&2 are linked together
Round 1: Team A (Player1, Player2) vs Team B (Player3, Player4)
Round 2: Team A (Player1, Player2) vs Team B (Player5, Player6)
```
Result: Players 1&2 can repeat as partners since they're linked

### Scenario 3: Sit-Out Priority
```
Round 1: Player5 sits out
Round 2: Player5 gets priority for team placement
```
Result: Fair rotation ensures balanced playing time

## Benefits

1. **Maximum Variety**: Players experience the widest possible range of partnerships before any repetition
2. **Fairest Distribution**: Mathematical optimization ensures the most equitable partnership distribution
3. **Enhanced Engagement**: Complete partnership rotation keeps the tournament fresh and interesting
4. **Fair Play**: Sit-out rotation ensures equal playing opportunities
5. **Flexibility**: Linked groups maintain their preferred partnerships while still contributing to fair tracking
6. **Strategic Depth**: Maximum partnership variety creates the most diverse competitive scenarios

## Implementation Details

### Data Structures
- `allUsedPartnerships`: Map tracking usage count of every partnership across all rounds
- `totalPossiblePartnerships`: Set of all mathematically possible partnerships for optimization reference
- `linkedGroups`: Array of player groups that should always play together

### Partnership Key Format
Partnerships are stored as sorted player ID pairs joined with '|':
```
Partnership between Player1 and Player2 = "Player1|Player2"
```

### Performance Optimization
- Maximum 50 attempts per round to find optimal team combinations
- Early termination when perfect match (all new partnerships, score 0) is found
- Exponential scoring system quickly identifies best combinations
- Fallback to least-repeated partnerships prevents infinite loops

## Testing Recommendations

1. **Small Groups (4-6 players)**: Test basic partnership rotation
2. **Large Groups (8+ players)**: Verify complex rotation scenarios  
3. **Linked Groups**: Confirm linked players stay together while others rotate
4. **Multiple Rounds**: Test partnership diversity over many rounds
5. **Sit-Out Scenarios**: Verify fair rotation when players must sit out

---

This advanced complete partnership rotation system creates the most engaging and mathematically fair grudge tournaments possible, ensuring maximum variety while respecting player preferences for linked partnerships.