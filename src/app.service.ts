import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';
import { TaskId } from './models/app.model';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly alertTimeoutInSeconds;
  private readonly feedsDirectory;

  constructor(private readonly configService: ConfigService) {
    this.alertTimeoutInSeconds = this.configService.get(
      'alertTimeoutInSeconds',
    );
    this.feedsDirectory = this.configService.get('feedsDirectory');
  }

  lookForFeeds() {
    this.logger.log('lookForFeeds service activated');

    this.logger.log(
      `alertTimeoutInSeconds was set to ${this.alertTimeoutInSeconds}`,
    );
    const scheduler = new ToadScheduler();
    const lookForFeedsTask = new AsyncTask(
      'look for feeds',
      () => {
        return this.isNewFeedArrived().then((isNewFeedArrived) => {
          if (isNewFeedArrived) {
            this.logger.log('OK');
          } else {
            this.logger.warn('Error');
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

  private async isNewFeedArrived(): Promise<boolean> {
    this.logger.log(`Checking for new feeds in ${this.feedsDirectory}`);
    return true;
  }
}
