export const DOWNLOAD_QUEUE = 'download-queue';
export const EXTRACT_QUEUE = 'extract-queue';

export interface DownloadJobData {
  urls: string[];
  path: string;
  userId: string;
}

export interface ExtractJobData {
  url: string;
  userId: string;
}
