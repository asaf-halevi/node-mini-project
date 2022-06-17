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
  private isErrorModeTurnedOn = false;

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
        return this.isNewFeedArrived(timeStamp).then(() => {
          return;
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

  private async isNewFeedArrived(timeStamp: number) {
    this.logger.verbose(
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

            relevantFileNames.push(fileNameWithoutSuffix);
          }
        });

        if (relevantFileNames.length) {
          this.feedArrived(timeStamp, relevantFileNames);
        } else {
          this.feedFailure(timeStamp);
        }
      }
    });
  }

  private feedArrived(timeStamp: number, fileNames: string[]) {
    //TODO - ADD TESTS
    if (this.isErrorModeTurnedOn) {
      this.isErrorModeTurnedOn = false;
      this.logger.log(`New feeds found at ${timeStamp}`);
    }
    //todo - write to DB
  }

  private feedFailure(timeStamp: number) {
    //TODO - ADD TESTS
    if (!this.isErrorModeTurnedOn) {
      this.isErrorModeTurnedOn = true;
      this.logger.warn(`Warning - No new feeds found at ${timeStamp}`);
    }
  }
}
