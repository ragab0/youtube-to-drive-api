import { Module, forwardRef } from '@nestjs/common';
import { YoutubeService } from './youtube.service.js';
import { YoutubeController } from './youtube.controller.js';
import { DriveModule } from '../drive/drive.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { JobsModule } from '../jobs/jobs.module.js';

@Module({
  imports: [DriveModule, AuthModule, forwardRef(() => JobsModule)],
  controllers: [YoutubeController],
  providers: [YoutubeService],
  exports: [YoutubeService],
})
export class YoutubeModule {}
