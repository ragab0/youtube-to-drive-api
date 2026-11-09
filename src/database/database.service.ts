import { neon } from '@neondatabase/serverless';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  private readonly sql;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    this.sql = neon(databaseUrl);
  }

  async getData() {
    const data = await this.sql`SELECT NOW()`;
    return data;
  }

  get db() {
    return this.sql;
  }
}
