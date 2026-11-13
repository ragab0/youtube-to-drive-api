import { tmpdir } from 'os';
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // fails if the disk is more than 90% full
      () =>
        this.disk.checkStorage('disk_root', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      // temp dir used by yt-dlp / ffmpeg
      () =>
        this.disk.checkStorage('disk_tmp', {
          path: tmpdir(),
          thresholdPercent: 0.9,
        }),
      () => this.memory.checkHeap('heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('rss', 1024 * 1024 * 1024),
    ]);
  }
}
