# Test Accounts Guide

## 🚀 Quick Start
All test accounts use the password: **`password123`**

## 👑 Team Administrators
Use these accounts to test team management features:

### Alice Johnson - `alice@example.com`
- **Team**: Lakeside FC (Soccer)
- **Role**: Team Admin
- **Members**: Bob, Emma, Frank, Grace (Captain), Henry
- **Use for**: Creating matches, assigning players, managing team roster

### Charlie Brown - `charlie@example.com`
- **Team**: Thunder Bolts (Basketball)
- **Role**: Team Admin  
- **Members**: Iris (Captain), Jack, Kate, Liam
- **Use for**: Basketball team management, different sport testing

### Diana Prince - `diana@example.com`
- **Team**: Eagle Eyes (Soccer)
- **Role**: Team Admin
- **Members**: Mike (Co-Captain), Nina, Oscar
- **Use for**: Smaller team dynamics, league match testing

### Bob Wilson - `bob@example.com`
- **Team**: Rocket Riders (Tennis)
- **Role**: Team Admin
- **Members**: Emma
- **Special**: Also a member of Lakeside FC
- **Use for**: Multi-team membership, tennis sport testing

## ⚽ Regular Players
Use these accounts to test player experience:

### Emma Davis - `emma@example.com`
- **Teams**: Lakeside FC, Rocket Riders
- **Use for**: Multi-team player experience

### Frank Miller - `frank@example.com`
- **Team**: Lakeside FC
- **Use for**: Regular player experience

### Grace Lee - `grace@example.com` 
- **Team**: Lakeside FC
- **Role**: Captain
- **Use for**: Team captain features (if implemented)

### Other Players:
- **Henry Taylor** - `henry@example.com` (Lakeside FC)
- **Iris Chen** - `iris@example.com` (Thunder Bolts, Captain)
- **Jack Rodriguez** - `jack@example.com` (Thunder Bolts)
- **Kate Singh** - `kate@example.com` (Thunder Bolts)
- **Liam O'Connor** - `liam@example.com` (Thunder Bolts)
- **Mike Thompson** - `mike@example.com` (Eagle Eyes, Co-Captain)
- **Nina Patel** - `nina@example.com` (Eagle Eyes)
- **Oscar Kim** - `oscar@example.com` (Eagle Eyes)

## 🏆 League Manager
### League Manager - `manager@example.com`
- **Use for**: League management features (when implemented)
- **Has access to**: Premier Soccer League

## 🎮 Testing Scenarios

### Team Management
1. **Login as Alice** → Create matches, assign players from Lakeside FC
2. **Login as Diana** → Manage Eagle Eyes team, create opposing matches
3. **Login as Charlie** → Test basketball sport features

### Player Experience  
1. **Login as Emma** → Experience being on multiple teams
2. **Login as Frank** → Standard player availability and assignment workflow
3. **Login as Grace** → Captain role features

### Multi-Team Features
1. **Login as Bob** → Admin of one team, member of another
2. **Switch between teams** → Test different sport management

### Match Assignment Testing
1. **Create match as Alice** (Lakeside FC admin)
2. **Login as team members** → Set availability
3. **Return to Alice** → Assign available players
4. **Test notifications** → Check player assignment notifications

### League Features (Future)
1. **Login as manager@example.com** → League management
2. **Create league matches** between Lakeside FC and Eagle Eyes
3. **Test cross-team assignment restrictions**

## 🔧 Team Invite Codes
- **Lakeside FC**: `LAKE123`
- **Thunder Bolts**: `THUNDER`
- **Eagle Eyes**: `EAGLE99`
- **Rocket Riders**: `ROCKET7`
- **Premier Soccer League**: `PREMIER`

## 📅 Pre-Created Matches
The seed script creates 2 upcoming matches:
1. **Thunder Bolts vs City Hoops** (Basketball, 3 days from now)
2. **Rocket Riders vs Tennis Aces** (Tennis, 5 days from now)

## 🚨 Reset Database
To reset and re-seed the database:
```bash
npx prisma migrate reset
node prisma/seed.js
```

---
**Happy Testing!** 🎯