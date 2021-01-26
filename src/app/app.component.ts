import { Component, ViewChild, ElementRef, Query }       from '@angular/core';
import { Router, NavigationEnd } from '@angular/router'; // Router added to provide analytics on route changes

import { FeedbackService } from './feedback/feedback.service';
import { PlaylistManagerService } from './playlist-manager/playlist-manager.service';
import { Playlist } from './playlist-manager/playlist';
import { takeUntil } from "rxjs/operators";

import { SearchFormService } from './shared/search-form/search-form.service';
import { SearchFormOptions } from './shared/search-form/search-form-options';

import { TitleManagerService } from './shared/title-manager.service';

import { AnalyticsService } from './ll-analytics.service';

import { RouterHistoryService } from './shared/services';

import { BaseComponent } from './shared/base.component';
import { UserSettingsManagerService } from './user-settings/user-settings-manager.service';

@Component({
    selector: 'my-app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})

export class AppComponent extends BaseComponent {
    @ViewChild('feedbackInput') feedbackInputArea: ElementRef;
    @ViewChild('myClipsTitleInput') myClipsTitleInputArea: ElementRef;

    public givenFeedback: string = null;
    public optionalFeedbackEmail: string = null;
    public myClips: Playlist[];
    public myClipsWithCountMsg: string;

    public showMyContactUsModalForm: boolean = false;
    public showMyExportMyClipsModalForm: boolean = false;
    public showMyConfirmClearingMyClipsModalForm: boolean = false;
    public inSearchFormRoute: boolean = false;
    public inHelpFormRoute: boolean = false;
    public inContentLinksRoute: boolean = false;
    public inVideoPlaybackRoute: boolean = false;
    public inHomeRoute: boolean = false;
    public inShowingManyItemsRoute: boolean = false; // for any of biography set, story set, one biography story set

    public cachedTitle: string;
    public myClipsTitleCandidate: string;
    public myClipsTitleMaxLength: number = 140;
    public myClipsTitleLengthHelper: string = "lengthLimitInfoForMyClipsTitle"; // ID for which char count in title is given
    public myClipsURLCopyActionFresh: boolean = false;

    public showTopicSearch: boolean = false; // value will be read and set from userSettingsManagerService

    // Via RouterHistoryService
    previousUrlViaRouterHistoryService$ = this.routerHistoryService.previousUrl$;
    currentUrlViaRouterHistoryService$ = this.routerHistoryService.currentUrl$;

    constructor(public router: Router,
        private routerHistoryService: RouterHistoryService,
        private feedbackService: FeedbackService,
        private searchFormService: SearchFormService,
        private analyticsService: AnalyticsService,
        private titleManagerService: TitleManagerService,
        private userSettingsManagerService: UserSettingsManagerService,
        private playlistManagerService: PlaylistManagerService) {

        super(); // since this is a derived class from BaseComponent

        // Get subscriptions tied in using best practice recommendation for how to unsubscribe, here and
        // below in this component wherever .subscribe is used:
        playlistManagerService.myClips$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.myClips = value;
            this.setMyClipsCountMessage();
        });

        playlistManagerService.presentMyClipsExportForm$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            if (value)
                this.openMyExportMyClipsModalForm();
        });

        playlistManagerService.presentMyClipsConfirmClearingForm$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            if (value)
                this.openMyConfirmClearMyClipsModalForm();
        });

        feedbackService.presentFeedbackInputForm$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            if (value)
                this.openMyContactUsModalForm();
        });

        userSettingsManagerService.showTopicSearch$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.showTopicSearch = value;
        });

        // The event tracking tying in navigation ending of routing with Google Analytics is following
        // advice from blog.thecodecampus.de/angular-2-google-analytics-google-tag-manager/; we make use of
        // similar route event tracking to tie in a different analytics method of this.log... calls and its _ll JavaScript variable.
        // This ties into a module provided by LibLynx to support COUNTER compliance as needed by subscribing institutions.
        this.router.events.pipe(takeUntil(this.ngUnsubscribe)).subscribe(event => {
          if (event instanceof NavigationEnd) {

            // NOTE:  It would be nice to just use event.urlAfterRedirects, *but* unfortunately, the semicolon(s) used
            // to separate query parameters in the route, i.e., matrix URL notation, mess up Google Analytics, which stops
            // reporting the URL from the first encountered semicolon onward.  So, process the URL and replace the first
            // ";" with "?" and all subsequent ";" with "&" and pass that on to Google Analytics instead.
            // See https://github.com/DSpace/dspace-angular/issues/109 for details (which were still in effect June 2017);
            // we retain this "clean" URL in working with COUNTER logging as well....
            var cleanedURL: string = this.cleanedForAnalyticsReport(event.urlAfterRedirects);

            this.inSearchFormRoute = (cleanedURL.startsWith("/search") || cleanedURL.startsWith("/storyadvs")
                                       || cleanedURL.startsWith("/bioadvs") || cleanedURL.startsWith("/tag")); // NOTE: considering tag/topic search route a search form, too
            this.inHelpFormRoute = cleanedURL.startsWith("/help");
            this.inContentLinksRoute = cleanedURL.startsWith("/contentlinks");
            this.inVideoPlaybackRoute = cleanedURL.startsWith("/story/");
            this.inHomeRoute = cleanedURL.startsWith("/home");
            this.inShowingManyItemsRoute = (cleanedURL.startsWith("/all") || cleanedURL.startsWith("/stories/")
             || cleanedURL.startsWith("/storiesForBio"));

            // NOTE: How routes are assembled very much matters in the code elsewhere, for example the code and logic in
            // setOptionsAndRouteToPage() within historymakers.component.ts.  The assumptions are:
            // For a story item, the route begins /story/ followed by the numeric ID of the story being requested.  BUT!!!
            // Since story item should be logged with year of publication, and since that comes from a biography ID that is fetched
            // during the load of that page, defer the logging of a story request until after that biography ID has been fetched.
            // Instead of logging "logStoryLookupForCOUNTER" here on the /story/ route, that call is made elsewhere.
            //
            // For biographies, the route begins with /storiesForBio with first argument ID= with the ID following.
            // Instead of logging "logBiographyLookupForCOUNTER" here on the /storiesForBio/ route, that call is made elsewhere.
            //
            // For biography set queries, an argument after the /all path is the query specifier q=.
            // For biography set queries via a filter specifier, an argument after the /all path is the specifier spec=.
            //
            // For story set queries from text, an argument after the /stories/2 path is the query specifier q=.
            // For story set queries from tags, an argument after the /stories/3 path is the tag specifier q=.
            // For story set queries via a filter specifier, an argument after the /stories/ path is the specifier spec=.            // It is necessary to separate out the FIRST time these
            // NOTE: for set queries, we need to ONLY count the first appearance of the set, not when the set is returned
            // back to (e.g., back button in interface for a story or biography to return back to its originating set), and
            // not on paging (e.g., going to page 2 and then back to page 1).  Elsewhere in code that produces these routes,
            // we add in a 'ut' argument (use tracking) as a final argument so that if the "&ut=1" fragment is in the cleanedURL
            // then it is a candidate for logging.  This breadcrumb simplifies the logic below and gives us a gate for which
            // URLs to check.
            if (cleanedURL.indexOf("&ut=1") > 0) {
              // NOTE:  the presence of the ut=1 indicates this route as the FIRST time this query set is shown, so "use tracking"
              // and log it.  Similar routes without the "ut=1" will happen on paging and/or going back to the set from an item.
              // NOTE: by not testing for ?ut=1 here, we explicitly assume it is tacked on after at least one other query parameter
              // like q or spec.  If "spec" is there with "ut=1" it *IS* a new filtering; check that first as such a URI often
              // has a "q" parameter, too, i.e., the ordering of these checks below matters.
                if (cleanedURL.startsWith("/all?") && (cleanedURL.indexOf("?spec=") > 0 || cleanedURL.indexOf("&spec=") > 0)) {
                    // must have "spec=" as filter specification argument
                    var givenQuerySpec: string = this.parseCleanURLForKey(cleanedURL, "spec");
                    // console.log("Bio search (via filter): " + givenQuerySpec);
                    this.analyticsService.logBiographySearchForCOUNTER(givenQuerySpec, "filter");
                }
                else if (cleanedURL.startsWith("/all?") && (cleanedURL.indexOf("?q=") > 0 || cleanedURL.indexOf("&q=") > 0)) {
                    // must have "q=" as query argument
                    var givenQuerySpec: string = this.parseCleanURLForKey(cleanedURL, "q");
                    // console.log("Bio search: " + givenQuerySpec);
                    this.analyticsService.logBiographySearchForCOUNTER(givenQuerySpec, "search");
                }
                else if (cleanedURL.startsWith("/stories/") && (cleanedURL.indexOf("?spec=") > 0 || cleanedURL.indexOf("&spec=") > 0)) {
                    // must have "spec=" as filter specification argument; don't care about what type of story set (the number after
                    // stories/ in route), e.g., we count filtering of My Clips story set too since "filter" == Azure Search
                    var givenQuerySpec: string = this.parseCleanURLForKey(cleanedURL, "spec");
                    // console.log("Story search (via filter): " + givenQuerySpec);
                    this.analyticsService.logStorySearchForCOUNTER(givenQuerySpec, "filter");
                }
                else if (cleanedURL.startsWith("/stories/3?") && (cleanedURL.indexOf("?q=") > 0 || cleanedURL.indexOf("&q=") > 0)) {
                    // must have "q=" as query argument
                    var givenQuerySpec: string = this.parseCleanURLForKey(cleanedURL, "q");
                    // console.log("Story search (via tags): " + givenQuerySpec);
                    this.analyticsService.logStoryTagSearchForCOUNTER(givenQuerySpec);
                }
                else if (cleanedURL.startsWith("/stories/2?") && (cleanedURL.indexOf("?q=") > 0 || cleanedURL.indexOf("&q=") > 0)) {
                    // must have "q=" as query argument
                    var givenQuerySpec: string = this.parseCleanURLForKey(cleanedURL, "q");
                    // console.log("Story search: " + givenQuerySpec);
                    this.analyticsService.logStorySearchForCOUNTER(givenQuerySpec, "search");
                }
            }
          }
        });
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

    private parseCleanURLForKey(givenCleanURL: string, givenKey: string): string {
      // Look for either ?key= or &key= and then take what follows the = through the end of string or &, whichever comes first
      var retVal: string = "";
      // Biography ID immediately follows "storiesForBio?ID=" and is ended by either & or end of string
      var workVal: number = givenCleanURL.indexOf("?" + givenKey + "=");
      if (workVal < 0)
          workVal = givenCleanURL.indexOf("&" + givenKey + "=");
      if (workVal >= 0) {
        var startOfID: number = workVal + 2 + givenKey.length; // move past key with its surrounding before/after punctuation
        var restForParsing: string = givenCleanURL.substring(startOfID);
        workVal = restForParsing.indexOf("&");
        if (workVal > 0)
          // value for this key runs from character at 0 up to but not including character at workVal
          retVal = restForParsing.substring(0, workVal);
        else if (workVal < 0)
          retVal = restForParsing.substring(0);
        // else on an immediate key=&, workVal will == 0 and just leave the return value as blank
      }
      return retVal;
    }

    ngOnInit() {
        this.showTopicSearch = this.userSettingsManagerService.currentShowTopicSearch();
        this.myClips = this.playlistManagerService.initializeMyClips();
        this.setMyClipsCountMessage();
    }

    private cleanedForAnalyticsReport(givenURI: string): string {
        var retVal: string = givenURI;
        const symbolToCleanAway: string = ";";
        var workVal: number = retVal.indexOf(symbolToCleanAway);

        // Turn string like /stories/2;q=mischief;pg=1;pgS=30;a=0 into /stories/2?q=mischief&pg=1&pgS=30&a=0 and
        // /stories/2;q=snow%20%26%20ice;a=0;sT=0;sS=0;sID=55079;spec=--;pgS=30;pg=1 into
        // /stories/2?q=snow%20%26%20ice&a=0&sT=0&sS=0&sID=55079&spec=--&pgS=30&pg=1
        if (workVal >= 0) {
            if (workVal == 0)
                retVal = "?" + retVal.substring(1);
            else if (workVal < retVal.length - 1)
                retVal = retVal.substring(0, workVal) + "?" + retVal.substring(workVal + 1);
            else
                retVal = retVal.substring(0, workVal) + "?";
            workVal = retVal.indexOf(symbolToCleanAway);
            while (workVal >= 0) {
                if (workVal < retVal.length - 1)
                    retVal = retVal.substring(0, workVal) + "&" + retVal.substring(workVal + 1);
                else
                    retVal = retVal.substring(0, workVal) + "&";
                workVal = retVal.indexOf(symbolToCleanAway);
            }
        }
        return retVal;
    }

    openContentLinks() {
      this.router.navigate(['/contentlinks']);
    }

    scrollHeaderIntoView(headerID: string) {
        // !!!TBD!!! Ideally we never need to use document, and ideally we can make use of newer Angular 9+ patterns like ViewportScroller.
        // See https://stackoverflow.com/questions/36101756/angular2-routing-with-hashtag-to-page-anchor for context.
        setTimeout(() => {
            const anchor = document.getElementById(headerID);
            if (anchor) {
                anchor.focus();
                anchor.scrollIntoView();
            }
        });
    }

    isRouteActive(routeToCheck: string): boolean {
        return (this.router && this.router.url && this.router.url == routeToCheck);
    }

    setNavChoice(newRoute: string) {
        if (!this.isRouteActive(newRoute)) {
            var routerCommands: string[] = [];
            routerCommands.push(newRoute);
            this.router.navigate(routerCommands);
        }
    }

    openMySimpleSearch() {
        // This search takes different forms, depending on the status of the search form service.
        // Pass the form in router parameters so that on a series of browser "go back" operations the
        // appropriate state of the search will be returned to (e.g., search stories, or just one person's stories, etc.).
        var moreNavigationParams = {};
        var currentSearchOptions: SearchFormOptions = this.searchFormService.currentSearchOptions();

        if (currentSearchOptions.searchingBiographies)
            moreNavigationParams['forBio'] = "1" ;
        else {
            moreNavigationParams['forBio'] = "0" ;
            if (currentSearchOptions.biographyAccessionID != "") {
                moreNavigationParams['ID'] = currentSearchOptions.biographyAccessionID; // search within this person's stories
            }
        }
        this.router.navigate(['/search', moreNavigationParams]);
    }

    openMyContactUsModalForm() {
        this.cachedTitle = this.titleManagerService.getTitle();
        this.titleManagerService.setTitle("Contact Us, The HistoryMakers Digital Archive");
        this.showMyContactUsModalForm = true;
    }

    closeMyContactUsModalForm() {
        this.titleManagerService.setTitle(this.cachedTitle);
        this.showMyContactUsModalForm = false;
    }

    clearFeedback() {
        this.givenFeedback = null;
        this.optionalFeedbackEmail = null;
        // Set the focus away from the Clear button, to the feedback input area.
        // NOTE: this technique is discussed here: https://codeburst.io/focusing-on-form-elements-the-angular-way-e9a78725c04f
        if (this.feedbackInputArea && this.feedbackInputArea.nativeElement)
            this.feedbackInputArea.nativeElement.focus();
    }

    cancelFeedbackAndCloseMyModal() {
        this.givenFeedback = null;
        this.optionalFeedbackEmail = null;

        this.closeMyContactUsModalForm();
    }

    postFeedbackAndCloseMyModal() {
        var feedbackMessage: string;

        if (this.givenFeedback) {
            feedbackMessage = this.givenFeedback.trim();
            if (feedbackMessage.length > 0) {
                if (this.optionalFeedbackEmail && this.optionalFeedbackEmail.trim().length > 0) {
                    // Tack on "Comment provider email: " addendum
                    feedbackMessage += "\n  Comment provider email: " + this.optionalFeedbackEmail.trim();
                }
                this.feedbackService.postFeedback(feedbackMessage);
            }
        }
        // Clear feedback after it is submitted:
        this.givenFeedback = null;
        this.optionalFeedbackEmail = null;

        this.closeMyContactUsModalForm();
    }

    // The functions below deal with the "My Clips Title/URL" exporting.
    openMyExportMyClipsModalForm() {
        if (this.myClipsTitleCandidate == null)
            this.myClipsTitleCandidate = "";
        this.cachedTitle = this.titleManagerService.getTitle(); // browser window page title
        this.titleManagerService.setTitle("Export your clips, The HistoryMakers Digital Archive");
        this.showMyExportMyClipsModalForm = true;
    }

    closeMyExportMyClipsModalForm() {
        // NOTE:  accessibility experts asked for clarity in modal form with no side effects, and so
        // there is no persistence of the last title candidate entered: it is cleared so on next display of the
        // modal form, it starts off empty.  For that reason, "Clear" button removed as well, since on close
        // of the modal the myClipsTitleCandidate will be cleared.
        this.myClipsTitleCandidate = "";
        this.titleManagerService.setTitle(this.cachedTitle);
        this.myClipsURLCopyActionFresh = false;
        this.showMyExportMyClipsModalForm = false;
    }

    // The functions below deal with the "My Clips" clearing and getting a confirmation for this action.
    openMyConfirmClearMyClipsModalForm() {
        this.cachedTitle = this.titleManagerService.getTitle(); // browser window page title
        this.titleManagerService.setTitle("Confirm clearing your clips, The HistoryMakers Digital Archive");
        this.showMyConfirmClearingMyClipsModalForm = true;
    }

    closeMyConfirmClearMyClipsModalForm() {
        this.titleManagerService.setTitle(this.cachedTitle);
        this.showMyConfirmClearingMyClipsModalForm = false;
    }

    clearMyClipsConfirmed() {
        // Clear My Clips back to an empty set.
        this.titleManagerService.setTitle(this.cachedTitle); // important this is done before clearMyClips() call which might trigger other title changes
        this.playlistManagerService.clearMyClips();
        this.showMyConfirmClearingMyClipsModalForm = false;
    }

    myTitledMyClipsURI(): string {
        // Via Angular 9+ directive cdkCopyToClipboard, copy to the clipboard.
        if (this.myClipsTitleCandidate && this.myClipsTitleCandidate.length > 0)
            return this.titledMyClipsAsURL(this.myClipsTitleCandidate);
        else
            return "";
    }

    private markMyClipsURICopyAsDone() {
        this.myClipsURLCopyActionFresh = true; // FYI, actual copy to clipboard done via Angular 9+ directive cdkCopyToClipboard
    }

    private titledMyClipsAsURL(titlePiece: string): string {
        // NOTE: assumptions exist here regarding the route fragment to get to a story set (/stories/6;IDList=)
        var retVal: string = "";
        var url: string = ""
        var favCount: number = this.myClips.length;
        if (favCount > 0) {
            retVal = this.myClips[0].storyID.toString();
            for (var i:number = 1; i < this.myClips.length; i++)
                retVal = retVal + "%2C" + this.myClips[i].storyID;
            url = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '') + "/stories/6;IDList=" + retVal;

            // NOTE: certain characters in router mess up router parsing, e.g., !
            // Rather than figure out nuances of router parsing, simplify what can be used
            // as a title to just alphanumeric and space.
            var cleanedTitle: string = titlePiece.replace(/\s\s+/g, ' '); // consecutive whitespace turned into single space
            cleanedTitle = cleanedTitle.replace(/[^a-zA-Z0-9 \-\,\'\"\_\.]/g, ''); // keep only alphanumeric, dash -, comma, single or double quote ' ", underscore _, period . and space, nothing else

            if (cleanedTitle) url = url + ";ListTitle=" + encodeURIComponent(cleanedTitle);
        }
        else url = "";
        return url;
    }

    private handleMyClipsTitleInput() {
        // Used to help label the characters left in the given myClips title in a modal form according to accessibility expert advice.
        // On "input", remove the aria-describedby attribute (by setting what it is bound to, myClipsTitleLengthHelper, to "") so
        // that on entering title characters this title length is not read incrementally and annoyingly.
        this.myClipsTitleLengthHelper = "";
        this.myClipsURLCopyActionFresh = false;
    }
    private handleMyClipsTitleInputBlur() {
        // Used to help label the characters left in the given myClips title in a modal form according to accessibility expert advice.
        // On "blur", restore the described by attribute for the textarea input element (bound to myClipsTitleLengthHelper)
        setTimeout(() => this.myClipsTitleLengthHelper = "lengthLimitInfoForMyClipsTitle", 0);
    }
    private thinToLegalMyClipsTitleKeyUp() {
        // Purpose: thin out characters just like titledMyClipsAsURL behaves, i.e.,
        // keep only alphanumeric, dash -, comma, single or double quote ' ", underscore _, period . and space, nothing else
        if (this.myClipsTitleCandidate.match(/[^a-zA-Z0-9 \-\,\'\"\_\.]/g))
            this.myClipsTitleCandidate = this.myClipsTitleCandidate.replace(/[^a-zA-Z0-9 \-\,\'\"\_\.]/g, '');
    }
}
