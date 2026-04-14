import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      displayName: string;
      role: {
        id: string;
        name: string; // 'ADMIN' | 'BOSS' | 'EMPLOYEE'
      };
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    username: string;
    displayName: string;
    role: {
      id: string;
      name: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    displayName: string;
    role: {
      id: string;
      name: string;
    };
  }
}
