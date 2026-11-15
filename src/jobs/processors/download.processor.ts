import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DOWNLOAD_QUEUE, DownloadJobData } from '../jobs.constants.js';
import { YoutubeService } from '../../youtube/youtube.service.js';
import { GoogleDriveService } from '../../drive/drive.service.js';
import { UsersService } from '../../users/users.service.js';

@Processor(DOWNLOAD_QUEUE)
export class DownloadProcessor extends WorkerHost {
  private readonly logger = new Logger(DownloadProcessor.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly driveService: GoogleDriveService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async process(job: Job<DownloadJobData>): Promise<any> {
    const { urls, path, userId } = job.data;
    const user = await this.usersService.getById(userId);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Resolve the Drive folder ID
    const folderId = await this.driveService.resolvePath(user, path);

    // Get existing archive content to skip duplicates
    const archivedIds = await this.driveService.getArchiveContent(
      user,
      folderId,
    );

    const results = [];
    let processedCount = 0;

    for (const url of urls) {
      try {
        const info = (await this.youtubeService.getInfo(url)) as any;
        const isPlaylist = info.type === 'playlist';
        const videosToProcess = isPlaylist ? info.videos : [info];

        for (let i = 0; i < videosToProcess.length; i++) {
          const video = videosToProcess[i];

          if (archivedIds.includes(video.id)) {
            this.logger.log(`Skipping video ${video.id} (already downloaded)`);
            results.push({
              id: video.id,
              status: 'skipped',
              title: video.title,
            });
            continue;
          }

          let displayTitle = video.title;
          if (isPlaylist) {
            const index = String(i + 1).padStart(2, '0');
            displayTitle = `${index} - ${displayTitle}`;
          }

          this.logger.log(`Starting download for ${displayTitle} to Drive...`);

          await job.updateProgress({
            current: video.title,
            processed: ++processedCount,
          });

          const stream = this.youtubeService.getDownloadStream(video.url);
          const fileName = `${displayTitle}.mp4`.replace(/[<>:"/\\|?*]/g, '_');

          await this.driveService.uploadStream(
            user,
            folderId,
            fileName,
            stream,
          );
          await this.driveService.updateArchive(user, folderId, video.id);

          results.push({
            id: video.id,
            status: 'success',
            title: displayTitle,
          });
        }
      } catch (error: any) {
        this.logger.error(`Failed to process ${url}: ${error.message}`);
        results.push({ url, status: 'error', message: error.message });
      }
    }

    return { folderId, results };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
