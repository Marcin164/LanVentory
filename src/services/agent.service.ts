// import { Injectable, NotFoundException } from '@nestjs/common';
// import { initPropelAuth } from '@propelauth/node';

// @Injectable()
// export class AgentsService {
//   private propelAuth;

//   constructor() {
//     this.propelAuth = initPropelAuth({
//       authUrl: process.env.PROPELAUTH_AUTH_URL!,
//       apiKey: process.env.PROPELAUTH_API_KEY!,
//     });
//   }

//   async getUserMetadata(userId: string) {
//     const user = await this.propelAuth.getUserMetadata(userId);

//     if (!user) {
//       throw new NotFoundException('User not found');
//     }

//     return user;
//   }

//   async updateUserSettings(userId: string, settings: Record<string, any>) {
//     await this.propelAuth.updateUserMetadata(userId, {
//       settings,
//     });

//     return {
//       success: true,
//     };
//   }
// }
