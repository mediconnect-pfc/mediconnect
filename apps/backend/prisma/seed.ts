import { PrismaClient, EstabType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // Établissements
  const clinique = await prisma.establishment.upsert({
    where: { id: 'seed-clinic-001' },
    update: {},
    create: {
      id: 'seed-clinic-001',
      name: 'Clinique Centrale',
      type: EstabType.CLINIC,
      phone: '+212 5XX XX XX XX',
    },
  });

  const hopital = await prisma.establishment.upsert({
    where: { id: 'seed-hospital-001' },
    update: {},
    create: {
      id: 'seed-hospital-001',
      name: 'Hôpital Universitaire',
      type: EstabType.HOSPITAL,
      phone: '+212 5XX XX XX XX',
    },
  });

  // Utilisateurs
  await prisma.user.upsert({
    where: { email: 'doctor@test.com' },
    update: {},
    create: {
      establishmentId: clinique.id,
      name: 'Dr. Dupont',
      email: 'doctor@test.com',
      password,
      role: UserRole.DOCTOR,
      specialty: 'Cardiologie',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      establishmentId: clinique.id,
      name: 'Sophie Martin',
      email: 'admin@test.com',
      password,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reception@test.com' },
    update: {},
    create: {
      establishmentId: hopital.id,
      name: 'Ahmed Benali',
      email: 'reception@test.com',
      password,
      role: UserRole.RECEPTIONIST,
    },
  });

  // SuperAdmin
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@test.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@test.com',
      password,
    },
  });

  console.log('✅ Seed terminé');
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        COMPTES DE TEST                   ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log('║  doctor@test.com    / password123  (Dr.) ║');
  console.log('║  admin@test.com     / password123  (Admin)║');
  console.log('║  reception@test.com / password123  (Acc) ║');
  console.log('║  superadmin@test.com/ password123  (Super)║');
  console.log('╚══════════════════════════════════════════╝');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
