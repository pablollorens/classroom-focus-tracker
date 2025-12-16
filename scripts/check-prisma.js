const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Checking Prisma Client...');
if (prisma.sessionAttendance) {
    console.log('SUCCESS: prisma.sessionAttendance exists!');
} else {
    console.log('FAILURE: prisma.sessionAttendance is UNDEFINED');
    console.log('Keys on prisma:', Object.keys(prisma));
}
