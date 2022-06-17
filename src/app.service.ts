import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';
import { TaskId } from './models/app.model';
import * as fs from 'fs';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly alertTimeoutInSeconds: number;
  private readonly feedsDirectory: string;
  private readonly validFeedFileSuffix: string;
  private readonly validUserIds: string[];

  constructor(private readonly configService: ConfigService) {
    this.alertTimeoutInSeconds = this.configService.get(
      'alertTimeoutInSeconds',
    );
    this.feedsDirectory = this.configService.get('feedsDirectory');
    this.validFeedFileSuffix = this.configService.get('validFeedFileSuffix');
    this.validUserIds = this.configService.get('validUserIds');
  }

  lookForFeeds() {
    this.logger.log(
      `lookForFeeds service activated. alertTimeoutInSeconds was set to ${this.alertTimeoutInSeconds}`,
    );
    const scheduler = new ToadScheduler();
    const lookForFeedsTask = new AsyncTask(
      'look for feeds',
      () => {
        const timeStamp = Date.now();
        return this.isNewFeedArrived(timeStamp).then((newFileNames) => {
          if (newFileNames?.length) {
            this.feedArrived(timeStamp, newFileNames);
          } else {
            this.feedFailure(timeStamp);
          }
        });
      },
      (error: Error) => {
        this.logger.error(`Error thrown in lookForFeeds: ${error}`);
      },
    );
    const job = new SimpleIntervalJob(
      { seconds: this.alertTimeoutInSeconds, runImmediately: true },
      lookForFeedsTask,
      TaskId.LOOK_FOR_FEEDS,
    );

    scheduler.addSimpleIntervalJob(job);
  }

  private async isNewFeedArrived(timeStamp: number): Promise<string[]> {
    this.logger.log(
      `Checking for new feeds in ${this.feedsDirectory} at ${timeStamp}`,
    );
    const relevantFileNames: string[] = [];
    fs.readdir(this.feedsDirectory, { withFileTypes: true }, (error, files) => {
      if (error) {
        throw new Error(
          `Error trying to look for feeds in ${this.feedsDirectory}: ${error}`,
        );
      } else {
        files?.forEach((file) => {
          const isValidFileType = file.name.endsWith(this.validFeedFileSuffix);
          const fileNameWithoutSuffix = file.name.replace(
            this.validFeedFileSuffix,
            '',
          );
          if (this.validUserIds.includes(fileNameWithoutSuffix)) {
            //TODO - ADD TIMESTAMP CHECK

            this.logger.log(file.name);
            relevantFileNames.push(fileNameWithoutSuffix);
          }
        });
      }
    });
    return relevantFileNames;
  }

  private feedArrived(timeStamp: number, fileNames: string[]) {
    //TODO - ADD TESTS
    const fileNamesAsString = fileNames?.join(',') ?? '';
    this.logger.log(`New feeds found at ${timeStamp}: ${fileNamesAsString}`);
    //todo - write to DB
  }

  private feedFailure(timeStamp: number) {
    //TODO - ADD TESTS
    this.logger.warn(`No new feeds found at ${timeStamp}`);
  }
}
