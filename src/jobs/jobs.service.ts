import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EXTRACT_QUEUE, ExtractJobData } from './jobs.constants.js';
import { DOWNLOAD_QUEUE } from './jobs.constants.js';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(DOWNLOAD_QUEUE) private downloadQueue: Queue,
    @InjectQueue(EXTRACT_QUEUE) private extractQueue: Queue,
  ) {}

  // 01] Add Job Methods

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

  async addExtractJob(url: string, userId: string): Promise<string> {
    const data: ExtractJobData = {
      url,
      userId,
    };
    const job = await this.extractQueue.add('extract', data);
    return job.id!;
  }

  // 02] Get Job Status Methods

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

  async getExtractJobStatus(jobId: string) {
    const job = await this.extractQueue.getJob(jobId);
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
