import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import { User } from '../users/user.entity.js';
import { YoutubeService } from './youtube.service.js';
import { GoogleDriveService } from '../drive/drive.service.js';

@ApiTags('youtube')
@UseGuards(AuthGuard)
@Controller('youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly driveService: GoogleDriveService,
  ) {}

  @ApiOperation({
    summary: 'Extract video or playlist details from a YouTube URL',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://www.youtube.com/watch?v=...' },
      },
      required: ['url'],
    },
  })
  @Post('extract')
  async extract(@Body('url') url: string) {
    if (!url) throw new BadRequestException('URL is required');
    return await this.youtubeService.getInfo(url);
  }

  @ApiOperation({ summary: 'Download videos directly to Google Drive' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description:
            'List of YouTube URLs (video or playlist). Playlists are expanded automatically.',
          example: ['https://www.youtube.com/playlist?list=PL...'],
        },
        path: {
          type: 'string',
          description: 'Target folder path in Google Drive',
          example: '/My Downloads/Youtube',
        },
      },
      required: ['urls', 'path'],
    },
  })
  @Post('download')
  async download(
    @CurrentUser() user: User,
    @Body('urls') urls: string[],
    @Body('path') path: string,
  ) {
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('At least one URL is required');
    }
    if (!path) throw new BadRequestException('Path is required');

    // Resolve the Drive folder ID
    const folderId = await this.driveService.resolvePath(user, path);

    // Get existing archive content to skip duplicates
    const archivedIds = await this.driveService.getArchiveContent(
      user,
      folderId,
    );

    const results = [];

    // Process each video
    for (const url of urls) {
      try {
        const info = (await this.youtubeService.getInfo(url)) as any;

        // Handle both single video and playlist entries
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

          const stream = this.youtubeService.getDownloadStream(video.url);
          const fileName = `${displayTitle}.mp4`.replace(/[<>:"/\\|?*]/g, '_'); // Basic sanitization

          await this.driveService.uploadStream(
            user,
            folderId,
            fileName,
            stream,
          );

          // Update archive file in Drive
          await this.driveService.updateArchive(user, folderId, video.id);

          results.push({
            id: video.id,
            status: 'success',
            title: displayTitle,
          });
        }
      } catch (error: any) {
        this.logger.error(`Failed to process ${url}: ${error.stack || error.message}`);
        results.push({ url, status: 'error', message: error.message });
      }
    }

    return { folderId, results };
  }
}
