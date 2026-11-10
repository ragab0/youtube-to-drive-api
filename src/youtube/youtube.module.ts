import { Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service.js';
import { YoutubeController } from './youtube.controller.js';
import { DriveModule } from '../drive/drive.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DriveModule, AuthModule],
  controllers: [YoutubeController],
  providers: [YoutubeService],
})
export class YoutubeModule {}
