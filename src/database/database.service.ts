import { neon } from '@neondatabase/serverless';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly sql?: any;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    const provider = this.configService.get<string>('DB_PROVIDER', 'local');

    this.logger.log(
      `Initializing database connection using provider: ${provider}...`,
    );

    if (provider === 'neon') {
      this.sql = neon(databaseUrl);
    }
  }

  async onModuleInit() {
    try {
      if (this.sql) {
        // Neon is lazy, so we do a simple query to verify connection
        await this.sql`SELECT 1`;
        this.logger.log('Successfully connected to Neon database via HTTP');
      } else {
        if (this.dataSource.isInitialized) {
          this.logger.log(
            'Successfully connected to local database via TypeORM',
          );
        } else {
          this.logger.warn('TypeORM DataSource is not initialized yet');
        }
      }
    } catch (error) {
      this.logger.error(
        `Database connection failed: ${(error as any).message}`,
      );
      throw error;
    }
  }

  async getData() {
    if (this.sql) {
      return await this.sql`SELECT NOW()`;
    }
    return await this.dataSource.query('SELECT NOW()');
  }

  get db() {
    return this.sql || this.dataSource;
  }
}
