import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service.js';
import { DownloadProcessor } from './processors/download.processor.js';
import { YoutubeModule } from '../youtube/youtube.module.js';
import { DriveModule } from '../drive/drive.module.js';
import { UsersModule } from '../users/users.module.js';
import { DOWNLOAD_QUEUE } from './jobs.constants.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DOWNLOAD_QUEUE,
    }),
    forwardRef(() => YoutubeModule),
    DriveModule,
    UsersModule,
  ],
  providers: [JobsService, DownloadProcessor],
  exports: [JobsService],
})
export class JobsModule {}
