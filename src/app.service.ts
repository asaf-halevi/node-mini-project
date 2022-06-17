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
  private latestFeedTimeStamp: number;

  constructor(private readonly configService: ConfigService) {
    this.alertTimeoutInSeconds = this.configService.get(
      'alertTimeoutInSeconds',
    );
    this.feedsDirectory = this.configService.get('feedsDirectory');
    this.validFeedFileSuffix = this.configService.get('validFeedFileSuffix');
    this.validUserIds = this.configService.get('validUserIds');
    this.latestFeedTimeStamp = Date.now();
  }

  lookForFeeds() {
    this.logger.log(
      `lookForFeeds service activated. alertTimeoutInSeconds was set to ${this.alertTimeoutInSeconds}`,
    );

    fs.watch(this.feedsDirectory, (event, filename) => {
      if (fs.existsSync(`${this.feedsDirectory}\\${filename}`)) {
        this.checkAndReportNewFeed(filename);
      }
    });

    const scheduler = new ToadScheduler();
    const checkForErrors = new AsyncTask(
      'check for errors',
      () => {
        return this.checkForErrorsInFeed().then(() => {
          return;
        });
      },
      (error: Error) => {
        this.logger.error(`Error thrown in lookForFeeds: ${error}`);
      },
    );
    const job = new SimpleIntervalJob(
      { seconds: this.alertTimeoutInSeconds, runImmediately: true },
      checkForErrors,
      TaskId.CHECK_FOR_ERRORS,
    );

    scheduler.addSimpleIntervalJob(job);
  }

  private checkAndReportNewFeed(fileName: string) {
    this.logger.verbose(`Checking validity of file ${fileName}`);
    const isValidFileType = fileName.endsWith(this.validFeedFileSuffix);
    const fileNameWithoutSuffix = fileName.replace(
      this.validFeedFileSuffix,
      '',
    );
    if (this.validUserIds.includes(fileNameWithoutSuffix)) {
      // relevantFileNames.push(fileNameWithoutSuffix);
      //todo - write to DB

      this.latestFeedTimeStamp = Date.now();
      this.logger.log(`sending to DB ${fileName}`);
    }
  }

  private feedArrived() {
    //TODO - ADD TESTS
    if (this.isErrorModeTurnedOn) {
      this.isErrorModeTurnedOn = false;
      this.logger.log(`Back to noraml - new feeds found`);
    }
  }

  private feedFailure() {
    //TODO - ADD TESTS
    if (!this.isErrorModeTurnedOn) {
      this.isErrorModeTurnedOn = true;
      this.logger.warn(`Warning - No new feeds found`);
    }
  }

  private async checkForErrorsInFeed() {
    const timeSinceLastFeed = (Date.now() - this.latestFeedTimeStamp) / 1000;
    if (timeSinceLastFeed >= this.alertTimeoutInSeconds) {
      this.feedFailure();
    } else {
      this.feedArrived();
    }
  }
}
