import { NextAuthOptions } from "next-auth";

import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                username: { label: "Username", type: "text" }, // For students
                type: { label: "Type", type: "text" } // "teacher" or "student"
            },
            async authorize(credentials) {
                // STUDENT LOGIN
                if (credentials?.username) {
                    const student = await prisma.student.findFirst({
                        where: { username: credentials.username }
                    });

                    if (!student) return null;

                    return {
                        id: student.id,
                        name: `${student.firstName} ${student.lastName}`,
                        email: null, // Students might not have email
                        role: "student",
                        username: student.username
                    };
                }

                // TEACHER LOGIN
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const teacher = await prisma.teacher.findUnique({
                    where: {
                        email: credentials.email,
                    },
                });

                if (!teacher || !teacher.passwordHash) {
                    return null;
                }

                const isValid = await bcrypt.compare(
                    credentials.password,
                    teacher.passwordHash
                );

                if (!isValid) {
                    return null;
                }

                return {
                    id: teacher.id,
                    email: teacher.email,
                    name: teacher.email,
                    role: "teacher"
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).username = token.username;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.username = (user as any).username;
            }
            return token;
        },
    },
};
