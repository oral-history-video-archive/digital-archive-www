import { Injectable, Inject, OnInit } from '@angular/core';
import { Subject }    from 'rxjs/Subject';
import { takeUntil } from "rxjs/operators";

import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { FeedbackInfo } from './feedback-info';
import { environment } from '../../environments/environment';
import { BaseComponent } from '../shared/base.component';

@Injectable()
export class FeedbackService extends BaseComponent {
    public presentFeedbackInputForm: Subject<boolean> = new Subject<boolean>();
    public presentFeedbackInputForm$ = this.presentFeedbackInputForm.asObservable();

    private postFeedbackURL = 'Feedback';


    constructor(private http: HttpClient) {
        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)
    }

    triggerFeedbackInputForm() {
        // NOTE: Relying on a listener to changes in presentFeedbackInputForm to actually do the (modal) feedback input form display.
        // Here we just signal it.
        this.presentFeedbackInputForm.next(true);
    }

    postFeedback(feedbackMessage: string) {
        var UNKNOWN_MARKER: string = "*Unknown*";
        var feedbackInfo: FeedbackInfo = new FeedbackInfo();
        var language: string = UNKNOWN_MARKER;
        var userAgent: string = UNKNOWN_MARKER;
        var platform: string = UNKNOWN_MARKER;
        var myURL: string = UNKNOWN_MARKER;

        var resolutionInfo: string = UNKNOWN_MARKER;
        if (window != null && window.navigator != null) {
            if (window.navigator.language != null)
                language = window.navigator.language;
            if (window.navigator.userAgent != null)
                userAgent = window.navigator.userAgent;
            if (window.navigator.platform != null)
                platform = window.navigator.platform;
            if (window.innerWidth != null && window.innerHeight != null)
                resolutionInfo = window.innerWidth + "x" + window.innerHeight;
        }
        if (document != null && document.location != null && document.location.href != null)
            myURL = document.location.href;
        feedbackInfo.Comments = feedbackMessage;
        feedbackInfo.Date = new Date().toISOString();
        feedbackInfo.Language = language;
        feedbackInfo.Platform = platform;
        feedbackInfo.Resolution = resolutionInfo;
        feedbackInfo.URL = myURL;
        feedbackInfo.UserAgent = userAgent;

        const headers = new HttpHeaders({'Content-Type':'application/json; charset=utf-8'});
        this.http.post(environment.serviceBase + this.postFeedbackURL, feedbackInfo, {headers: headers}).pipe(takeUntil(this.ngUnsubscribe)).subscribe(
          (data) => {
            // TODO: not sure if we want to log this to analytics or console, e.g., console.log(data);
          },
          (err: HttpErrorResponse) => {
            if (err.error instanceof Error) {
              console.log('Client-side error occurred with posting feedback.');
            } else {
              console.log('Server-side error occurred with posting feedback.');
            }
          }
        );
    }
}
