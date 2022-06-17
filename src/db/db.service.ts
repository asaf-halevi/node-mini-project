import { Injectable, Logger } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);

  constructor(private readonly configService: ConfigService) {
    const dbConnectionString = this.configService.get('dbConnectionString');
    mongoose.connect(dbConnectionString);
  }

  writeToDb(timeStamp: number, fileName: string) {
    this.logger.log(`Reporting ${fileName} to DB at timestamp ${timeStamp}`);
  }
}
