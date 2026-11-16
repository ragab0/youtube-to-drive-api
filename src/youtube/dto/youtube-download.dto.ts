import { ApiProperty } from '@nestjs/swagger';
import { JobBaseStatusDto } from '../../jobs/dto/jobs.dto.js';

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
    description: 'Target folder path in Google Drive (e.g. "/Courses/Elzero1")',
    example: '/Courses/Elzero1',
  })
  path: string;
}

class DownloadResultDto {
  @ApiProperty({ example: 'Courses/Elzero1' })
  folderId: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'dQw4w9WgXcQ' },
        status: { type: 'string', example: 'success' },
        title: {
          type: 'string',
          example: 'Rajieen | راجعين (OFFICIAL MUSIC VIDEO)',
        },
      },
    },
  })
  results: any[];
}

export class DownloadJobStatusDto extends JobBaseStatusDto {
  @ApiProperty({ example: 100 })
  progress?: number;

  @ApiProperty({ type: DownloadResultDto, required: false })
  result?: DownloadResultDto;
}
