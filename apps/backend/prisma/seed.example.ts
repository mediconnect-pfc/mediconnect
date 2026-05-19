import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Super Admin
  const superAdminPassword = await bcrypt.hash('CHANGE_ME', 10);
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@mediconnect.ma' },
    update: {},
    create: {
      name: 'MediConnect Super Admin',
      email: 'superadmin@mediconnect.ma',
      password: superAdminPassword,
    },
  });

  // Establishment
  await prisma.establishment.upsert({
    where: { id: 'est-001' },
    update: {},
    create: {
      id: 'est-001',
      name: 'Clinique Example',
      type: 'CLINIC',
      plan: 'FREE',
      phone: '+212600000000',
      address: 'Casablanca',
    },
  });

  console.log('🎉 Seed completed!');
  console.log('⚠️  Remember to change default passwords!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
