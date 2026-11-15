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
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import { User } from '../users/user.entity.js';
import { YoutubeService } from './youtube.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import {
  DownloadRequestDto,
  ExtractRequestDto,
  ExtractResponseDto,
} from './youtube.dto.js';

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
    description:
      'Uses the official YouTube Data API v3 to fetch metadata. Supports videos, playlists, shorts, and live streams.',
  })
  @ApiResponse({
    status: 200,
    description: 'Extracted metadata',
    type: ExtractResponseDto,
  })
  @Post('extract')
  async extract(@Body() body: ExtractRequestDto) {
    const { url } = body;
    if (!url) throw new BadRequestException('URL is required');
    return await this.youtubeService.getInfo(url);
  }

  @ApiOperation({
    summary: 'Download videos directly to Google Drive',
    description:
      'Queues a background job to download media and upload it to the specified Drive path.',
  })
  @ApiResponse({
    status: 201,
    description: 'Job created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        jobId: { type: 'string' },
        statusUrl: { type: 'string' },
      },
    },
  })
  @Post('download')
  async download(@CurrentUser() user: User, @Body() body: DownloadRequestDto) {
    const { urls, path } = body;
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
