import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin2004@gmail.com';
  const password = 'admin@2004';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Clean up any leftover Chief Admin records from User table
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: 'admin2004@gmail.com' },
        { email: 'chiefadmin@gmail.com' },
        { role: 'CHIEF_ADMIN' },
      ],
    },
  });

  const existingChiefAdmin = await prisma.chiefAdmin.findUnique({
    where: { email },
  });

  if (existingChiefAdmin) {
    const updated = await prisma.chiefAdmin.update({
      where: { email },
      data: {
        password: hashedPassword,
        isLocked: false,
      },
    });
    console.log(`✅ Updated existing account ${email} in table "ChiefAdmin"!`);
    console.log(`ID: ${updated.id}`);
  } else {
    const created = await prisma.chiefAdmin.create({
      data: {
        name: 'Chief Admin',
        email,
        password: hashedPassword,
        isLocked: false,
      },
    });
    console.log(`✅ Created new CHIEF_ADMIN account ${email} in table "ChiefAdmin"!`);
    console.log(`ID: ${created.id}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error creating Chief Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
