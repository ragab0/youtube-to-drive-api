import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity.js';
import { CryptoService } from '../crypto.js';

@Injectable()
export class AuthService {
  private readonly client: OAuth2Client;

  constructor(
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    this.client = new OAuth2Client(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      this.config.getOrThrow<string>('OAUTH_REDIRECT_URI'),
    );
  }

  getGoogleAuthUrl(state: string) {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.file',
      ],
      state,
    });
  }

  async authenticate(code: string) {
    const { tokens } = await this.client.getToken(code);

    if (!tokens.id_token) {
      throw new BadRequestException('Google did not return an identity');
    }

    if (!tokens.scope?.includes('drive.file')) {
      throw new BadRequestException('Drive permission was not granted');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new BadRequestException('Invalid ID token payload');
    }

    const email = payload.email.toLowerCase();

    let user = await this.users.findOneBy({ googleSub: payload.sub });

    if (!user) {
      user = this.users.create({
        googleSub: payload.sub,
        email,
      });
    }

    if (tokens.refresh_token) {
      user.refreshToken = this.crypto.encrypt(tokens.refresh_token);
    }

    await this.users.save(user);

    return user;
  }

  async findUserById(id: string) {
    return this.users.findOneBy({ id });
  }
}
