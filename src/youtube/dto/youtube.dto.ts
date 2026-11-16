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
