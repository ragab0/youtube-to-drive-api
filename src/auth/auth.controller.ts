import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  login(@Req() req: Request, @Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    (req as any).session.oauth_state = state;
    res.redirect(this.authService.getGoogleAuthUrl(state));
  }

  @Get('google/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const savedState = (req as any).session?.oauth_state;
    if (!state || state !== savedState) {
      throw new BadRequestException('Invalid OAuth state');
    }

    const user = await this.authService.authenticate(code);

    delete (req as any).session.oauth_state;
    (req as any).session.userId = user.id;

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? '/';
    res.redirect(frontendUrl);
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    (req as any).session = null;
    res.status(204).send();
  }

  @Get('me')
  async me(@Req() req: Request) {
    const userId = (req as any).session?.userId;
    if (!userId) return { authenticated: false };

    const user = await this.authService.findUserById(userId);
    if (!user) {
      (req as any).session = null;
      return { authenticated: false };
    }

    return {
      authenticated: true,
      email: user.email,
    };
  }
}
