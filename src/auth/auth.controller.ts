import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AuthService } from './auth.service.js';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Initiate Google OAuth login flow' })
  @Get('google')
  login(@Req() req: Request, @Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    (req as any).session.oauth_state = state;
    res.redirect(this.authService.getGoogleAuthUrl(state));
  }

  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Google' })
  @ApiQuery({ name: 'state', description: 'CSRF protection state' })
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

  @ApiOperation({ summary: 'Logout the current user' })
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    (req as any).session = null;
    res.status(204).send();
  }

  @ApiOperation({ summary: 'Get current authenticated user information' })
  @ApiResponse({
    status: 200,
    description: 'User info or unauthenticated status',
  })
  @Get('me')
  async me(@Req() req: Request) {
    this.logger.log(
      `Checking /me. Session ID present: ${!!(req as any).session?.userId}`,
    );
    this.logger.debug(
      `Cookies received: ${JSON.stringify(req.headers.cookie)}`,
    );

    const userId = (req as any).session?.userId;
    if (!userId) return { authenticated: false };

    const user = await this.authService.findUserById(userId);
    if (!user) {
      this.logger.warn(`User ID ${userId} in session not found in DB`);
      (req as any).session = null;
      return { authenticated: false };
    }

    return {
      authenticated: true,
      email: user.email,
    };
  }
}
