import { ApiProperty } from '@nestjs/swagger';
import { VideoResponseDto } from './youtube.dto.js';
import { JobBaseStatusDto } from '../../jobs/dto/jobs.dto.js';

export class ExtractRequestDto {
  @ApiProperty({
    description: 'YouTube video or playlist URL',
    example: 'https://www.youtube.com/watch?v=ug0L5S2Qzwg',
  })
  url: string;
}

class ExtractResultDto {
  @ApiProperty({ enum: ['video', 'playlist'] })
  type: string;

  @ApiProperty({ required: false })
  id?: string;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false, example: 'VlLY0RAx-LQ' })
  videoId?: string;

  @ApiProperty({
    required: false,
    example: 'https://i.ytimg.com/vi/VlLY0RAx-LQ/maxresdefault.jpg',
  })
  thumbnail?: string;

  @ApiProperty({ required: false, example: 789 })
  duration?: number;

  @ApiProperty({ type: [VideoResponseDto], required: false })
  videos?: VideoResponseDto[];
}

export class ExtractJobStatusDto extends JobBaseStatusDto {
  @ApiProperty({ type: ExtractResultDto, required: false })
  result?: ExtractResultDto;
}
