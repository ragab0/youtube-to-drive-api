import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CryptoService } from '../crypto.js';
import { User } from '../users/user.entity.js';
import { Readable } from 'stream';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  private getOAuth2Client(user: User): OAuth2Client {
    const client = new google.auth.OAuth2(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      this.config.getOrThrow<string>('OAUTH_REDIRECT_URI'),
    );

    if (!user.refreshToken) {
      throw new Error('User has no refresh token');
    }

    client.setCredentials({
      refresh_token: this.crypto.decrypt(user.refreshToken),
    });

    return client;
  }

  private getDrive(user: User): drive_v3.Drive {
    const auth = this.getOAuth2Client(user);
    return google.drive({ version: 'v3', auth });
  }

  /**
   * Resolves a path like '/Folder/Sub' to a Folder ID.
   * Creates folders if they don't exist.
   */
  async resolvePath(user: User, path: string): Promise<string> {
    const drive = this.getDrive(user);
    const parts = path.split('/').filter((p) => p.length > 0);
    let parentId = 'root';

    for (const part of parts) {
      const q = `name = '${part}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
      const res = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (res.data.files && res.data.files.length > 0) {
        parentId = res.data.files[0].id!;
      } else {
        const folderMetadata = {
          name: part,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        };
        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id',
        });
        parentId = folder.data.id!;
      }
    }

    return parentId;
  }

  async uploadStream(
    user: User,
    folderId: string,
    fileName: string,
    stream: Readable,
    mimeType: string = 'video/mp4',
  ) {
    const drive = this.getDrive(user);
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    const media = {
      mimeType,
      body: stream,
    };

    return new Promise((resolve, reject) => {
      // Monitor stream errors
      stream.on('error', (err) => {
        this.logger.error(`Stream error during upload: ${err.message}`);
        reject(err);
      });

      drive.files
        .create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, name',
        })
        .then((res) => resolve(res.data))
        .catch((err) => {
          this.logger.error(`Failed to upload to Drive: ${err.message}`);
          reject(err);
        });
    });
  }

  async getArchiveContent(user: User, folderId: string): Promise<string[]> {
    const drive = this.getDrive(user);
    const q = `name = 'downloaded.txt' and '${folderId}' in parents and trashed = false`;
    const res = await drive.files.list({ q, fields: 'files(id)' });

    if (res.data.files && res.data.files.length > 0) {
      const fileId = res.data.files[0].id!;
      const content = await drive.files.get({
        fileId,
        alt: 'media',
      });
      return (content.data as string)
        .split('\n')
        .filter((s) => s.trim().length > 0);
    }
    return [];
  }

  async updateArchive(user: User, folderId: string, videoId: string) {
    const drive = this.getDrive(user);
    const q = `name = 'downloaded.txt' and '${folderId}' in parents and trashed = false`;
    const res = await drive.files.list({ q, fields: 'files(id)' });

    let fileId: string;
    let existingContent = '';

    if (res.data.files && res.data.files.length > 0) {
      fileId = res.data.files[0].id!;
      const contentRes = await drive.files.get({ fileId, alt: 'media' });
      existingContent = contentRes.data as string;

      const newContent = `${existingContent.trim()}\n${videoId}\n`;
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'text/plain',
          body: newContent,
        },
      });
    } else {
      const fileMetadata = {
        name: 'downloaded.txt',
        parents: [folderId],
      };
      const media = {
        mimeType: 'text/plain',
        body: `${videoId}\n`,
      };
      await drive.files.create({
        requestBody: fileMetadata,
        media,
      });
    }
  }
}
