import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard, CurrentUser } from '../auth/auth.guard.js';
import { User } from '../users/user.entity.js';
import { JobsService } from '../jobs/jobs.service.js';
import { JobCreateResponseDto } from '../jobs/dto/jobs.dto.js';
import {
  ExtractJobStatusDto,
  ExtractRequestDto,
} from './dto/youtube-extract.dto.js';
import {
  DownloadJobStatusDto,
  DownloadRequestDto,
} from './dto/youtube-download.dto.js';

@ApiTags('youtube')
@UseGuards(AuthGuard)
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly jobsService: JobsService) {}

  // 01] Post [extract, download];

  @ApiOperation({
    summary: 'Extract video or playlist details from a YouTube URL (Async)',
    description:
      'Queues a background job to fetch metadata using the official YouTube Data API v3. Supports videos, playlists, shorts, and live streams.',
  })
  @ApiResponse({
    status: 202,
    description: 'Extraction job queued successfully',
    type: JobCreateResponseDto,
  })
  @HttpCode(202)
  @Post('extract')
  async extract(@CurrentUser() user: User, @Body() body: ExtractRequestDto) {
    const { url } = body;
    if (!url) throw new BadRequestException('URL is required');
    const jobId = await this.jobsService.addExtractJob(url, user.id);
    return {
      message: 'Extraction job queued successfully',
      jobId,
      statusUrl: `/api/youtube/extract/status/${jobId}`,
    };
  }

  @ApiOperation({
    summary: 'Download videos directly to Google Drive',
    description:
      'Queues a background job to download media and upload it to the specified Drive path.',
  })
  @ApiResponse({
    status: 202,
    description: 'Download job queued successfully',
    type: JobCreateResponseDto,
  })
  @HttpCode(202)
  @Post('download')
  async download(@CurrentUser() user: User, @Body() body: DownloadRequestDto) {
    const { urls, path } = body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('At least one URL is required');
    }
    if (!path) throw new BadRequestException('Path is required');

    const jobId = await this.jobsService.addDownloadJob(urls, path, user.id);

    return {
      message: 'Download job queued successfully',
      jobId,
      statusUrl: `/api/youtube/download/status/${jobId}`,
    };
  }

  // 02] Get Status [extract, download];

  @ApiOperation({ summary: 'Check the status and result of an extraction job' })
  @ApiResponse({ status: 200, type: ExtractJobStatusDto })
  @Get('extract/status/:jobId')
  async getExtractStatus(@Param('jobId') jobId: string) {
    const status = await this.jobsService.getExtractJobStatus(jobId);
    if (!status) {
      throw new NotFoundException(`Extraction job with ID ${jobId} not found`);
    }
    return status;
  }

  @ApiOperation({ summary: 'Check the status and progress of a download job' })
  @ApiResponse({ status: 200, type: DownloadJobStatusDto })
  @Get('download/status/:jobId')
  async getDownloadStatus(@Param('jobId') jobId: string) {
    const status = await this.jobsService.getDownloadJobStatus(jobId);
    if (!status) {
      throw new NotFoundException(`Download job with ID ${jobId} not found`);
    }
    return status;
  }
}
