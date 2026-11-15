import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DOWNLOAD_QUEUE } from './jobs.constants.js';

@Injectable()
export class JobsService {
  constructor(@InjectQueue(DOWNLOAD_QUEUE) private downloadQueue: Queue) {}

  // 01] Download Job Methods

  async addDownloadJob(
    urls: string[],
    path: string,
    userId: string,
  ): Promise<string> {
    const job = await this.downloadQueue.add('download', {
      urls,
      path,
      userId,
    });
    return job.id!;
  }

  async getDownloadJobStatus(jobId: string) {
    const job = await this.downloadQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
