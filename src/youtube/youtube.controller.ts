import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import { User } from '../users/user.entity.js';
import { YoutubeService } from './youtube.service.js';
import { JobsService } from '../jobs/jobs.service.js';

@ApiTags('youtube')
@UseGuards(AuthGuard)
@Controller('youtube')
export class YoutubeController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly jobsService: JobsService,
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

    const jobId = await this.jobsService.addDownloadJob(urls, path, user.id);

    return {
      message: 'Download inquiry received successfully',
      jobId,
      statusUrl: `/api/youtube/status/${jobId}`,
    };
  }

  @ApiOperation({ summary: 'Check the status and progress of a download job' })
  @Get('status/:jobId')
  async getStatus(@Param('jobId') jobId: string) {
    const status = await this.jobsService.getDownloadJobStatus(jobId);
    if (!status) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    return status;
  }
}
