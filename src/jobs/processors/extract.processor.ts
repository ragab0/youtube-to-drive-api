import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EXTRACT_QUEUE, ExtractJobData } from '../jobs.constants.js';
import { YoutubeService } from '../../youtube/youtube.service.js';

@Processor(EXTRACT_QUEUE)
export class ExtractProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractProcessor.name);

  constructor(private readonly youtubeService: YoutubeService) {
    super();
  }

  async process(job: Job<ExtractJobData>): Promise<any> {
    const { url } = job.data;
    this.logger.log(`Processing extraction for ${url} (Job: ${job.id})`);

    try {
      const result = await this.youtubeService.getInfo(url);
      this.logger.log(`Successfully extracted info for ${url}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to extract info for ${url}: ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Extract Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Extract Job ${job.id} failed: ${error.message}`);
  }
}
