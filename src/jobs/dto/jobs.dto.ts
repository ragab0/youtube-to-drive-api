import { ApiProperty } from '@nestjs/swagger';

export class JobCreateResponseDto {
  @ApiProperty({ example: 'Job ... queued successfully' })
  message: string;

  @ApiProperty({ example: '1' })
  jobId: string;

  @ApiProperty({ example: '/api/.../status/1' })
  statusUrl: string;
}

export class JobBaseStatusDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({
    example: 'completed',
    description: 'queued | active | completed | failed',
  })
  state: string;

  @ApiProperty({ description: 'The original job input payload' })
  data: Record<string, any>;

  @ApiProperty({ required: false })
  failedReason?: string;
}
