import { Injectable, Logger } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DbService {
  private readonly logger = new Logger(DbService.name);
  private db;
  private readonly Feed;

  constructor(private readonly configService: ConfigService) {
    const dbConnectionString = this.configService.get('dbConnectionString');
    this.db = mongoose
      .connect(dbConnectionString)
      .then(() => {
        this.logger.log('Db connection established');
      })
      .catch((error) => {
        this.logger.error(`Db connection failed: ${error}`);
      });
    const FeedSchema = new mongoose.Schema({
      timeStamp: {
        type: Number,
        required: true,
      },
      fileName: {
        type: String,
        required: true,
      },
    });
    this.Feed = mongoose.model('Record', FeedSchema);
  }

  async writeToDb(timeStamp: number, fileName: string) {
    this.logger.log(`Reporting ${fileName} to DB at timestamp ${timeStamp}`);
    const feed = new this.Feed({ timeStamp, fileName });
    feed
      .save()
      .then(() => {
        this.logger.log(`Feed ${fileName} saved to DB`);
      })
      .catch((error) => {
        this.logger.error(`Failed to save feed ${fileName} to DB: ${error}`);
      });
  }
}
