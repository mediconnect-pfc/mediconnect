const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } });
  const admins = await prisma.superAdmin.findMany({ select: { id: true, name: true, email: true, createdAt: true } });
  console.log('\n=== UTILISATEURS ===');
  users.forEach(u => console.log(u.email + '  |  ' + u.name + '  |  ' + u.role + '  |  ' + u.createdAt.toISOString().split('T')[0]));
  console.log('\n=== SUPER ADMINS ===');
  admins.forEach(a => console.log(a.email + '  |  ' + a.name + '  |  ' + a.createdAt.toISOString().split('T')[0]));
  console.log('\nMot de passe pour tous: password123');
  await prisma.$disconnect();
}
main();
