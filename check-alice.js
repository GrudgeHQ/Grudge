const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'alice@example.com' },
      include: {
        memberships: {
          where: { isAdmin: true },
          include: { team: true }
        }
      }
    });
    
    console.log('=== ALICE ADMIN TEAMS ===');
    console.log(JSON.stringify(user?.memberships, null, 2));
    
    const adminTeamIds = user?.memberships.map(m => m.teamId) || [];
    console.log('\nAlice Admin Team IDs:', adminTeamIds);
    
    const submissions = await prisma.seasonMatchScoreSubmission.findMany({
      where: { status: 'PENDING' },
      include: {
        seasonMatch: {
          select: {
            id: true,
            homeTeamId: true,
            awayTeamId: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } }
          }
        },
        submittingTeam: { select: { name: true } }
      }
    });
    
    console.log('\n=== ALL PENDING SUBMISSIONS ===');
    submissions.forEach(sub => {
      const matchTeamIds = [sub.seasonMatch.homeTeamId, sub.seasonMatch.awayTeamId];
      const opposingTeamId = matchTeamIds.find(id => id !== sub.submittingTeamId);
      const isAliceOpposingAdmin = opposingTeamId && adminTeamIds.includes(opposingTeamId);
      
      console.log(`\nSubmission ID: ${sub.id}`);
      console.log(`  Match: ${sub.seasonMatch.homeTeam.name} vs ${sub.seasonMatch.awayTeam.name}`);
      console.log(`  Submitting Team: ${sub.submittingTeam.name} (${sub.submittingTeamId})`);
      console.log(`  Opposing Team ID: ${opposingTeamId}`);
      console.log(`  Is Alice admin of opposing team? ${isAliceOpposingAdmin}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
