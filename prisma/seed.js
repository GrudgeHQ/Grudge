const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with comprehensive test data...')
  const pass = await bcrypt.hash('password123', 10)

  // Create diverse test users
  const users = await Promise.all([
    // Team admins
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: { name: 'Alice Johnson', email: 'alice@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'charlie@example.com' },
      update: {},
      create: { name: 'Charlie Brown', email: 'charlie@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'diana@example.com' },
      update: {},
      create: { name: 'Diana Prince', email: 'diana@example.com', password: pass },
    }),
    
    // Regular players
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: { name: 'Bob Wilson', email: 'bob@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'emma@example.com' },
      update: {},
      create: { name: 'Emma Davis', email: 'emma@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'frank@example.com' },
      update: {},
      create: { name: 'Frank Miller', email: 'frank@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'grace@example.com' },
      update: {},
      create: { name: 'Grace Lee', email: 'grace@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'henry@example.com' },
      update: {},
      create: { name: 'Henry Taylor', email: 'henry@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'iris@example.com' },
      update: {},
      create: { name: 'Iris Chen', email: 'iris@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'jack@example.com' },
      update: {},
      create: { name: 'Jack Rodriguez', email: 'jack@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'kate@example.com' },
      update: {},
      create: { name: 'Kate Singh', email: 'kate@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'liam@example.com' },
      update: {},
      create: { name: 'Liam O\'Connor', email: 'liam@example.com', password: pass },
    }),
    
    // League manager
    prisma.user.upsert({
      where: { email: 'manager@example.com' },
      update: {},
      create: { name: 'League Manager', email: 'manager@example.com', password: pass },
    }),
    
    // Additional players for larger teams
    prisma.user.upsert({
      where: { email: 'mike@example.com' },
      update: {},
      create: { name: 'Mike Thompson', email: 'mike@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'nina@example.com' },
      update: {},
      create: { name: 'Nina Patel', email: 'nina@example.com', password: pass },
    }),
    prisma.user.upsert({
      where: { email: 'oscar@example.com' },
      update: {},
      create: { name: 'Oscar Kim', email: 'oscar@example.com', password: pass },
    }),
  ])

  const [alice, charlie, diana, bob, emma, frank, grace, henry, iris, jack, kate, liam, manager, mike, nina, oscar] = users

  // Create multiple teams for different sports
  const lakesideFC = await prisma.team.upsert({
    where: { name: 'Lakeside FC' },
    update: {},
    create: {
      name: 'Lakeside FC',
      sport: 'SOCCER',
      inviteCode: 'LAKE123',
      password: null,
      members: { 
        create: [
          { user: { connect: { id: alice.id } }, role: 'ADMIN', isAdmin: true },
          { user: { connect: { id: bob.id } }, role: 'MEMBER', isAdmin: false },
          { user: { connect: { id: emma.id } }, role: 'MEMBER', isAdmin: false },
          { user: { connect: { id: frank.id } }, role: 'MEMBER', isAdmin: false },
          { user: { connect: { id: grace.id } }, role: 'CAPTAIN', isAdmin: true },
          { user: { connect: { id: henry.id } }, role: 'MEMBER', isAdmin: false },
        ]
      },
    },
  })

  const thunderBolts = await prisma.team.upsert({
    where: { name: 'Thunder Bolts' },
    update: {},
    create: {
      name: 'Thunder Bolts',
      sport: 'BASKETBALL',
      inviteCode: 'THUNDER',
      password: null,
      members: { 
        create: [
          { user: { connect: { id: charlie.id } }, role: 'ADMIN', isAdmin: true },
          { user: { connect: { id: iris.id } }, role: 'CAPTAIN', isAdmin: true },
          { user: { connect: { id: jack.id } }, role: 'MEMBER', isAdmin: false },
          { user: { connect: { id: kate.id } }, role: 'MEMBER', isAdmin: false },
          { user: { connect: { id: liam.id } }, role: 'MEMBER', isAdmin: false },
        ]
      },
    },
  })

  const eagleEyes = await prisma.team.upsert({
    where: { name: 'Eagle Eyes' },
    update: {},
    create: {
      name: 'Eagle Eyes',
      sport: 'SOCCER',
      inviteCode: 'EAGLE99',
      password: null,
      members: { 
        create: [
          { user: { connect: { id: diana.id } }, role: 'ADMIN', isAdmin: true },
          { user: { connect: { id: mike.id } }, role: 'CO_CAPTAIN', isAdmin: true },
          { user: { connect: { id: nina.id } }, role: 'MEMBER', isAdmin: false },
          { user: { connect: { id: oscar.id } }, role: 'MEMBER', isAdmin: false },
        ]
      },
    },
  })

  const rocketRiders = await prisma.team.upsert({
    where: { name: 'Rocket Riders' },
    update: {},
    create: {
      name: 'Rocket Riders',
      sport: 'TENNIS',
      inviteCode: 'ROCKET7',
      password: null,
      members: { 
        create: [
          { user: { connect: { id: bob.id } }, role: 'ADMIN', isAdmin: true }, // Bob is also admin of another team
          { user: { connect: { id: emma.id } }, role: 'MEMBER', isAdmin: false },
        ]
      },
    },
  })

  // Create a league for soccer teams
  let premierLeague
  try {
    premierLeague = await prisma.league.create({
      data: {
        name: 'Premier Soccer League',
        sport: 'SOCCER',
        inviteCode: 'PREMIER',
        creatorId: manager.id,
      },
    })
  } catch (e) {
    // League might already exist, fetch it
    premierLeague = await prisma.league.findUnique({
      where: { inviteCode: 'PREMIER' }
    })
  }

  // Create some regular team matches for testing
  const now = new Date()
  const teamMatch1 = await prisma.match.create({
    data: {
      teamId: thunderBolts.id,
      opponentName: 'City Hoops',
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      location: 'Community Center',
      homeScore: null,
      awayScore: null,
      requiredPlayers: 5,
    }
  })

  const teamMatch2 = await prisma.match.create({
    data: {
      teamId: rocketRiders.id,
      opponentName: 'Tennis Aces',
      scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      location: 'Tennis Club',
      homeScore: null,
      awayScore: null,
      requiredPlayers: 2,
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log('📊 Created:')
  console.log(`   - ${users.length} users`)
  console.log(`   - 4 teams (Lakeside FC, Thunder Bolts, Eagle Eyes, Rocket Riders)`)
  console.log(`   - 2 team matches`)
  console.log('')
  console.log('🔑 Test accounts (all use password: password123):')
  console.log('   👑 Team Admins:')
  console.log('      - alice@example.com (Lakeside FC)')
  console.log('      - charlie@example.com (Thunder Bolts)')
  console.log('      - diana@example.com (Eagle Eyes)')
  console.log('      - bob@example.com (Rocket Riders)')
  console.log('   🏆 League Manager:')
  console.log('      - manager@example.com')
  console.log('   ⚽ Regular Players:')
  console.log('      - emma@example.com, frank@example.com, grace@example.com')
  console.log('      - henry@example.com, iris@example.com, jack@example.com')
  console.log('      - kate@example.com, liam@example.com, mike@example.com')
  console.log('      - nina@example.com, oscar@example.com')
  console.log('')
  console.log('🎮 Testing scenarios available:')
  console.log('   - Team match management and assignments')
  console.log('   - Multi-sport team management')
  console.log('   - Player availability and assignments')
  console.log('   - Cross-team membership (Bob is on multiple teams)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
