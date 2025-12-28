// import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
// import { AgentsService } from 'src/services/agent.service';
// import { AuthGuard } from 'src/guards/authGuard.guard';

// // np. AuthGuard który weryfikuje JWT PropelAuth
// @UseGuards(AuthGuard)
// @Controller('agent')
// export class AgentsController {
//   constructor(private readonly userService: AgentsService) {}

//   @Get('settings')
//   async getMe(@Req() req: any) {
//     const userId = (req as any).user.userId;

//     return this.userService.getUserMetadata(userId);
//   }

//   @Patch('settings')
//   async updateSettings(@Req() req: any, @Body() body: any) {
//     const userId = (req as any).user.userId;

//     return this.userService.updateUserSettings(userId, body.settings);
//   }
// }
