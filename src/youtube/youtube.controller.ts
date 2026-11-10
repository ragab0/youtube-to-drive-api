import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
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
}
