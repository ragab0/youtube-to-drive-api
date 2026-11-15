import { ApiProperty } from '@nestjs/swagger';

export class VideoResponseDto {
  @ApiProperty({ example: 'dQw4w9WgXcQ' })
  id: string;

  @ApiProperty({
    example: 'Rajieen | راجعين (OFFICIAL MUSIC VIDEO)',
  })
  title: string;

  @ApiProperty({
    example: 'https://i.ytimg.com/vi/ug0L5S2Qzwg/maxresdefault.jpg',
  })
  thumbnail: string;

  @ApiProperty({ example: 999 })
  duration: number;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=ug0L5S2Qzwg' })
  url: string;
}

export class ExtractResponseDto {
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

export class ExtractRequestDto {
  @ApiProperty({
    description: 'YouTube video or playlist URL',
    example: 'https://www.youtube.com/watch?v=ug0L5S2Qzwg',
  })
  url: string;
}

export class DownloadRequestDto {
  @ApiProperty({
    type: [String],
    description: 'List of YouTube URLs to process.',
    example: [
      'https://www.youtube.com/playlist?list=PLDoPjvoNmBAz0dbUTpK6KMc1YPfyYSFuO',
    ],
  })
  urls: string[];

  @ApiProperty({
    description: 'Target folder path in Google Drive (e.g. "/Music/Rock")',
    example: '/Youtube Downloads',
  })
  path: string;
}
