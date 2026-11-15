export const DOWNLOAD_QUEUE = 'download-queue';

export interface DownloadJobData {
  urls: string[];
  path: string;
  userId: string;
}
