require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'teacher@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await prisma.teacher.upsert({
        where: { email },
        update: {},
        create: {
            email,
            passwordHash: hashedPassword,
        },
    });

    console.log(`Created teacher: ${teacher.email} (Password: ${password})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
