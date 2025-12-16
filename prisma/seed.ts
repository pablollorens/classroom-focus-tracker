import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    const email = 'teacher@example.com'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    const teacher = await prisma.teacher.upsert({
        where: { email },
        update: {},
        create: {
            email,
            passwordHash: hashedPassword,
        },
    })

    console.log({ teacher })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
