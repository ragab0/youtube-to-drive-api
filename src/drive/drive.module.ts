import { Module } from '@nestjs/common';
import { GoogleDriveService } from './drive.service.js';
import { CryptoService } from '../crypto.js';

@Module({
  providers: [GoogleDriveService, CryptoService],
  exports: [GoogleDriveService],
})
export class DriveModule {}
