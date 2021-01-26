import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { takeUntil } from "rxjs/operators";

import { ActivatedRoute, Router, Params } from '@angular/router';

import { PlaylistManagerService } from '../playlist-manager/playlist-manager.service';
import { Playlist } from '../playlist-manager/playlist';
import { FeedbackService } from '../feedback/feedback.service';
import { WindowService, RouterHistoryService } from '../shared/services';
import { TitleManagerService } from '../shared/title-manager.service';

import { BaseComponent } from '../shared/base.component';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title
import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';

@Component({
    selector: 'thda-content-links',
    templateUrl: './content-links.component.html',
    styleUrls: ['./content-links.component.scss']
})
export class ContentLinksComponent extends BaseComponent implements OnInit, AfterViewChecked {
    @ViewChild('topBackButton') topBackItemElement: ElementRef;

    contentLinksPageTitle: string;
    contentLinksPageTitleLong: string;
    initialFocusMade: boolean = false;

    public myClips: Playlist[]; // needs to be public as it is seen/used in the .html template
    myClipsWithCountMsg: string;

    priorRoute: string; // used to compute extraDetailsOnPriorRoute
    extraDetailsOnPriorRoute: string; // used to decorate further the "Back" button label

    public showTopicSearch: boolean = false; // value will be read and set from userSettingsManagerService

    constructor(private route: ActivatedRoute,
      private router: Router,
      private feedbackService: FeedbackService,
      private windowService: WindowService,
      private routerHistoryService: RouterHistoryService,
      private playlistManagerService: PlaylistManagerService,
      private userSettingsManagerService: UserSettingsManagerService,
      private titleManagerService: TitleManagerService, private liveAnnouncer: LiveAnnouncer) {

        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)

        this.contentLinksPageTitle = "Content Links";
        this.contentLinksPageTitleLong = "Content Links, The HistoryMakers Digital Archive";
        this.titleManagerService.setTitle(this.contentLinksPageTitleLong);
        this.liveAnnouncer.announce(this.contentLinksPageTitle); // NOTE: using LiveAnnouncer to eliminate possible double-speak

        // Get subscriptions tied in using best practice recommendation for how to unsubscribe, here and
        // below in this component wherever .subscribe is used:
        playlistManagerService.myClips$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.myClips = value;
            this.setMyClipsCountMessage();
        });

        userSettingsManagerService.showTopicSearch$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.showTopicSearch = value;
        });

        routerHistoryService.previousUrl$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.priorRoute = value;
            this.setBackButtonDetail();
        });
    }

    setBackButtonDetail() {
        this.extraDetailsOnPriorRoute = ""; // will hopefully get more detailed
        // !!!TBD!!! Perhaps use string constants rather than literals here and in html renderings for consistency between titles and routes.
        if (this.priorRoute && this.priorRoute.length > 0) {
            if (this.priorRoute.startsWith("/home"))
                this.extraDetailsOnPriorRoute = " to Home";
            else if (this.priorRoute.startsWith("/all;q=")) // FYI must test specific before the general "Maker Directory"
                this.extraDetailsOnPriorRoute = " to Biography Set";
            else if (this.priorRoute.startsWith("/all"))
                this.extraDetailsOnPriorRoute = " to Maker Directory";
            else if (this.priorRoute.startsWith("/tag"))
                this.extraDetailsOnPriorRoute = " to Topic Search";
            else if (this.priorRoute.startsWith("/settings"))
                this.extraDetailsOnPriorRoute = " to Settings";
            else if (this.priorRoute.startsWith("/stories/4")) // FYI must test this specific story set before general one
                this.extraDetailsOnPriorRoute = " to My Clips";
            else if (this.priorRoute.startsWith("/stories/"))
                this.extraDetailsOnPriorRoute = " to Story Set";
            else if (this.priorRoute.startsWith("/help"))
                this.extraDetailsOnPriorRoute = " to Help";
            else if (this.priorRoute.startsWith("/storiesForBio"))
                this.extraDetailsOnPriorRoute = " to Biography";
            else if (this.priorRoute.startsWith("/story/"))
                this.extraDetailsOnPriorRoute = " to Story";
            else if (this.priorRoute.startsWith("/search"))
                this.extraDetailsOnPriorRoute = " to Search";
        }
    }

    ngOnInit() {
        this.showTopicSearch = this.userSettingsManagerService.currentShowTopicSearch();
        this.myClips = this.playlistManagerService.initializeMyClips();
        this.setMyClipsCountMessage();
    }

    ngAfterViewChecked() {
        // NOTE: this technique is discussed here: https://codeburst.io/focusing-on-form-elements-the-angular-way-e9a78725c04f
        if (this.topBackItemElement && this.topBackItemElement.nativeElement) {
          if (!this.initialFocusMade) {
              this.initialFocusMade = true; // extra "guard" needed March 2020 to allow tab navigation in this component
              this.topBackItemElement.nativeElement.focus();
          }
        }
    }

    private setMyClipsCountMessage() {
        var storyCount: number = 0;
        if (this.myClips)
            storyCount = this.myClips.length;

        if (storyCount == 1)
            this.myClipsWithCountMsg = "My Clips, 1 story";
        else
            this.myClipsWithCountMsg = "My Clips, " + storyCount + " stories";
    }

    openMyContactUsModalForm() {
        this.feedbackService.triggerFeedbackInputForm();
    }

    setNavChoice(newRoute: string) {
        var routerCommands: string[] = [];
        routerCommands.push(newRoute);
        this.router.navigate(routerCommands);
    }

    goBack($event: MouseEvent): void {
        $event.preventDefault();

        // !!!TBD!!! FYI, as needed this.routerHistoryService.previousUrl holds this route where we
        // head back to; see router-history for context and credit with RouterHistoryService sourced like WindowService

        this.windowService.nativeWindow.history.back();
    }
}
