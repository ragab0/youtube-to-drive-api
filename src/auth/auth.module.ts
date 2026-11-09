import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { User } from '../users/user.entity.js';
import { CryptoService } from '../crypto.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, CryptoService],
  exports: [AuthService, AuthGuard, CryptoService],
})
export class AuthModule {}
