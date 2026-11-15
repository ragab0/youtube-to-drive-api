import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { YoutubeService } from './youtube.service.js';
import { YoutubeController } from './youtube.controller.js';
import { DriveModule } from '../drive/drive.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { YOUTUBE_CLIENT } from './youtube.constants.js';

@Module({
  imports: [DriveModule, AuthModule, forwardRef(() => JobsModule)],
  controllers: [YoutubeController],
  providers: [
    YoutubeService,
    {
      provide: YOUTUBE_CLIENT,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('YOUTUBE_API_KEY');
        return google.youtube({
          version: 'v3',
          auth: apiKey,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [YoutubeService],
})
export class YoutubeModule {}
