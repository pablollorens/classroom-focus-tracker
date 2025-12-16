import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    username?: string;
  }

  interface Session {
    user: User & {
      id: string;
      role?: string;
      username?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    username?: string;
  }
}
