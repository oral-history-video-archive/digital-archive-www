import { Component, Input, OnInit, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { takeUntil } from "rxjs/operators";

import { HistoryMakerService } from '../historymakers/historymaker.service';
import { TitleManagerService } from '../shared/title-manager.service';
import { StoryDetailService } from './story-detail.service';
import { PlaylistManagerService } from '../playlist-manager/playlist-manager.service';
import { DetailedStory } from './detailed-story';

import { GlobalState } from '../app.global-state';
import { environment } from '../../environments/environment';
import { VideoMatchLine } from './video-match-line';

import { TimedTextMatch } from './timed-text-match';

import { Playlist } from '../playlist-manager/playlist';

import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';
import { AnalyticsService } from '../ll-analytics.service';
import { WindowService } from '../shared/services';

import { BaseComponent } from '../shared/base.component';
import { LiveAnnouncer } from '@angular/cdk/a11y'; // used to read adding/removing from My Clips

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'; // used to get Hide/Show Transcript to align correctly with transcript area

@Component({
    selector: 'thmda-story',
    templateUrl: './story.component.html',
    styleUrls: ['./story.component.scss'],
})
export class StoryComponent extends BaseComponent implements OnInit {
    @ViewChild('myVideoArea') videoPlayerAndControlsAreaRef: ElementRef;
    @ViewChild('myVideoPlayer') videoPlayerRef: any;

    mobileDetails: boolean = true; // NOTE: used in the html rendering of this component

    signalFocusToTitle: boolean; // is used in html rendering of this component

    readonly POSTER_NAME_4x3: string = "./assets/320x240black.png";
    readonly POSTER_NAME_DEFAULT: string = "./assets/320x180black.png";

    myStory: DetailedStory;
    backgroundPoster: string = this.POSTER_NAME_DEFAULT; // assume 16:9 unless overridden by content claiming 4:3 aspect ratio
    storyDetailsTitle: string;
    storyDetailsShortenedTitle: string;
    storyHasMatches: boolean;
    storyIsStarred: boolean;
    storyInMyClips: boolean;
    interviewDateSuffix: string;

    // Support interfaces for transcript hiding and scrolling
    isTranscriptShowing: boolean = true;
    toggleTranscriptLabel: string = "Hide Transcript";
    transcriptTextBlock: string;

    // Support interface for video playbar match ticks
    videoMatches: VideoMatchLine[];
    videoPositionInSeconds: number = 0;
    videoDurationInSeconds: number = 0;

    biographyDetailsReady: boolean = false;
    biographyAbstract: string;
    biographyPreferredName: string;
    biographyAccession: string;
    storyCitation: string;

    defaultAutoAdvance: boolean;

    // TODO: Revisit how best to preserve state for getting query terms for transcript matches (used in story rendering) - for now done with
    // a routing parameter
    transcriptQuery: string; // may be filled in via originating route

    // TODO: we may refactor how match context details are shared; for now just use one object
    myMatchContext: TimedTextMatch[];

    makerCategories = [];
    occupations = [];
    myClips: Playlist[];

    private myMediaBase: string;

    private haveEvidenceOfTranscriptInNarrowView: boolean = false;

    constructor(
        private _cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private router: Router,
        private globalState: GlobalState,
        private titleManagerService: TitleManagerService,
        private historyMakerService: HistoryMakerService,
        private storyDetailService: StoryDetailService,
        private playlistManagerService: PlaylistManagerService,
        private userSettingsManagerService: UserSettingsManagerService,
        private liveAnnouncer: LiveAnnouncer,
        private windowService: WindowService,
        private analyticsService: AnalyticsService,
        private breakpointObserver: BreakpointObserver
    ) {
        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)

        // Start off with an empty signal about what to focus on
        this.clearSignalsForCurrentFocusSetting();

        this.myMediaBase = environment.mediaBase;
        userSettingsManagerService.autoadvanceVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.defaultAutoAdvance = value;
        });

        // NOTE (!!!TBD!!!): here is some extra logic and event handlers to handle Angular Flex layout bugs/issues with getting hide/show transcript
        // button above rather than next to the transcript area.  Specifically, accessibility experts asked that a Hide/Show transcript
        // appear with the transcript but only for wide views. This introduced an Angular Flex layout related bug:
        // Hide Transcript button shown next to, rather than on top of, transcript area if and only if the view is narrow
        // (under 600 pixels) and the transcript tab is shown there, and then the window grows to be wide.
        // Solution: when under 600 pixels, if the transcript is on, make note with haveEvidenceOfTranscriptInNarrowView.
        // When at 600+ pixels, if this evidence is there, then if the transcript is on, turn it off so that it will show
        // only a Hide Transcript button and on toggle to Show transcript, Angular Flex layout will position correctly
        // button over rather than next to the transcript area.
        this.breakpointObserver.observe([
          '(min-width: 600px)'
            ]).pipe(takeUntil(this.ngUnsubscribe)).subscribe((result) => {
              if (result.matches) {
                  if (this.haveEvidenceOfTranscriptInNarrowView) {
                      if (this.isTranscriptShowing) // problem is only when transcript is "on" - if so, turn it off
                          this.toggleTranscriptDisplay();
                      this.haveEvidenceOfTranscriptInNarrowView = false; // back to wide view
                  }
              }
            });
    }

    ngOnInit() {
        this.myClips = this.playlistManagerService.initializeMyClips();
        this.defaultAutoAdvance = this.userSettingsManagerService.currentAutoadvance();

        this.route.params.forEach((params: Params) => {
            this.storyDetailsTitle = "Loading Story Details...";
            this.storyDetailsShortenedTitle = "Loading...";

            // Just in case, clear current interface while next one is loading,
            // e.g., this corrects the bug of clicking a My Clips item to load a new video:
            this.myStory = null;
            this.backgroundPoster = this.POSTER_NAME_DEFAULT;

            this.storyIsStarred = false;
            this.transcriptTextBlock = "";

            // Query context might get set via Params on route, which will allow match information to be returned via getStorySpecifics():
            this.transcriptQuery = null;
            this.storyHasMatches = false;
            this.videoMatches = [];
            this.myMatchContext = [];

            this.biographyDetailsReady = false;

            if (params['q'] !== undefined)
                this.transcriptQuery = params['q'];

            var myStoryID: number = +params['ID']; // + prefix converts string into a number
            this.storyDetailService.getStorySpecifics(myStoryID, this.transcriptQuery).pipe(takeUntil(this.ngUnsubscribe))
                .subscribe(
                  storyDetails => {
                    this.storyDetailsTitle = storyDetails.title;
                    this.storyDetailsShortenedTitle = this.truncateAsNeeded(storyDetails.title);

                    this.biographyAbstract = storyDetails.citation.descriptionShort;
                    this.biographyAccession = storyDetails.citation.accession;
                    this.biographyPreferredName = storyDetails.citation.preferredName;
                    this.biographyDetailsReady = true;

                    // NOTE:  Only now, with story details loaded, can we log the item request, since the year of
                    // publication for the item is within the biographyAccession which has just been loaded.
                    // Also logged is the title.
                    this.analyticsService.logStoryLookupForCOUNTER(myStoryID, this.biographyAccession, this.storyDetailsTitle);

                    this.videoPositionInSeconds = 0;
                    this.videoDurationInSeconds = storyDetails.duration / 1000; // could be a fraction, of course

                    this.myStory = storyDetails;

                    if (storyDetails != null) {
                        this.titleManagerService.setTitle("Details, " + storyDetails.title);
                        this.liveAnnouncer.announce("Story Details"); // NOTE: using LiveAnnouncer to eliminate possible double-speak

                        // Use the correct poster for the video.
                        if (storyDetails.aspectRatio && storyDetails.aspectRatio == "4:3")
                            this.backgroundPoster = this.POSTER_NAME_4x3;
                        else
                            this.backgroundPoster = this.POSTER_NAME_DEFAULT;

                        // Update it as a "starred" story if it is so marked by being in the favorites set:
                        this.storyInMyClips = (this.myClips.findIndex(x => x.storyID == this.myStory.storyID) >=0 );

                        this.storyCitation = this.ComposedCitationForStory(storyDetails.citation.preferredName, storyDetails.citation.accession,
                            storyDetails.citation.interviewer, storyDetails.citation.interviewDate, storyDetails.citation.sessionOrder, storyDetails.citation.tapeOrder,
                            storyDetails.storyOrder, storyDetails.title);

                        storyDetails.makerCategories.forEach(element => {
                            let category = this.historyMakerService.getMaker(element);
                            this.makerCategories.push(category);
                        });

                        this.occupations = storyDetails.occupations;

                        this.interviewDateSuffix = ", interviewed " + this.globalState.cleanedMonthDayYear(storyDetails.citation.interviewDate);

                        // Do more work to connect timed text offsets (e.g., transcript offsets)
                        // with video time, which will then be stored in this.myMatchContext for fast access during video play.
                        // If there are no matches, ComputeTimesForOffsets, DecorateVideoPlaybarWithMatches, and
                        // ComputeTranscriptWithMatches all do the right thing and hide nonexistent match details.
                        this.ComputeTimesForOffsets(); // will populate this.myMatchContext
                        this.DecorateVideoPlaybarWithMatches(); // show any match time offsets on play bar
                        this.ComputeTranscriptWithMatches(); // after matches loaded, dress up transcript
                        this.setFocusAsNeeded(); // context loaded successfully so manipulate focus
                    }
                    else {
                        this.titleManagerService.setTitle("The HistoryMakers - No Story Details Found");
                        this.liveAnnouncer.announce("No Story Details Found"); // NOTE: using LiveAnnouncer to eliminate possible double-speak
                        this.storyCitation = null;
                        this.setFocusAsNeeded(); // manipulate focus with empty context
                    }
                  },
                  error => {
                    // TODO: decide how specific to make error recovery, i.e., do one thing for ERR_NAME_NOT_RESOLVED
                    // which would need to get propagated out of handleError earlier, something different for other errors.
                    // Right now this "network timeout" message could be a lie, so soften the message to "may have."
                    this.myStory = null;
                    this.interviewDateSuffix = null;
                    this.storyDetailsTitle = "Loading story details may have experienced a network timeout -- try again in a few minutes.";
                    this.storyDetailsShortenedTitle = this.storyDetailsTitle; // NOTE: with myStory == null there will be more display space for this long "shortened" title
                    this.titleManagerService.setTitle("The HistoryMakers - No Story Details Found");
                    this.liveAnnouncer.announce("No Story Details Found"); // NOTE: using LiveAnnouncer to eliminate possible double-speak
                    this.storyCitation = null;
                    this.setFocusAsNeeded(); // manipulate focus with empty context
                  }
                );
        });

    }

    private setFocusAsNeeded() {

        this.userSettingsManagerService.updateMixtapeIDToFocus(this.globalState.NOTHING_CHOSEN); // forget/clear out mixtape selection as that is not this context
        this.userSettingsManagerService.updateBioIDToFocus(this.globalState.NO_ACCESSION_CHOSEN); // no biography focus in this story-scope either

        if (this.myStory) {
            if (this.myStory.storyID != this.globalState.NOTHING_CHOSEN) {
                // If any routes being returned back to have a way to put focus on this particular story,
                // indicate that it should be done via a user setting "StoryIDToFocus" since story is this route's context:
                this.userSettingsManagerService.updateStoryIDToFocus(this.myStory.storyID);
            }
        }

        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            // Set default focus to the title for this route, since we did internally route
            // in the SPA (single page application)
            // (as it is the target for skip-to-main content as well)
            this.signalFocusToTitle = true;
        }
    }

    private clearSignalsForCurrentFocusSetting() {
        this.signalFocusToTitle = false;
    }

    // Return the given string, unless it is too long, then return a shortened form ended with ...
    private truncateAsNeeded(givenString: string): string {
        var validatedString: string = givenString;
        const MAX_ALLOWABLE_LENGTH = 68;
        if (validatedString != null && validatedString.length > MAX_ALLOWABLE_LENGTH) {
            var lastIndex = givenString.lastIndexOf(' ', MAX_ALLOWABLE_LENGTH - 3);
            if (lastIndex < 0)
                // Could not find a space to break on, so just keep first MAX_ALLOWABLE_LENGTH - 3 characters
                lastIndex = MAX_ALLOWABLE_LENGTH - 2;
            validatedString = givenString.substring(0, lastIndex) + "...";
        }
        return validatedString;
    }

    public calcVTTName(givenStoryID: number): string {
        var retVal: string = "";
        if (givenStoryID != this.globalState.NOTHING_CHOSEN) {
            retVal = this.myMediaBase + "story/captions/" + givenStoryID;
        }
        return retVal;
    }

    private ComposedCitationForStory(bioPreferredName: string, bioAccessionNumber: string, interviewer: string, interviewDate: string,
        sessionNumber: number, tapeNumber: number, storyNumber: number, storyTitle: string): string {
        var citation: string = "";

        // NOTE: format for citation is:
        // Biography preferred name (The HistoryMakers accession_name), interviewed by ___, interview date,
        // The HistoryMakers Digital Archive. Session #, tape #, story #, story title.
        // Example:
        // Eddie Jenkins, Jr. (The HistoryMakers A2007.068), interviewed by Larry Crowe, February 14, 2007,
        // The HistoryMakers Digital Archive. Session 1, tape 4, story 9, Eddie Jenkins, Jr.
        // recalls the early days of weight training in the NFL.

        citation = bioPreferredName + " (The HistoryMakers " + bioAccessionNumber + "), interviewed by " + interviewer + ", " +
          this.globalState.cleanedMonthDayYear(interviewDate) + ", The HistoryMakers Digital Archive. Session " +
            sessionNumber + ", tape " + tapeNumber + ", story " + storyNumber + ", " + storyTitle;
        return citation;
    }

    // Helper function to show match time offsets on a play bar by initializing this.videoMatches
    private DecorateVideoPlaybarWithMatches() {
        // Based on match information, compute this.videoMatches
        var lastMatchTimeProcessed: number = -1;
        var matchLine: VideoMatchLine;
        var percentValue: number;

        for (var iMatch: number = 0; iMatch < this.myMatchContext.length; iMatch++) {
            if (this.myMatchContext[iMatch].time > lastMatchTimeProcessed) {
                lastMatchTimeProcessed = this.myMatchContext[iMatch].time;
                matchLine = new VideoMatchLine();
                matchLine.time = lastMatchTimeProcessed;
                // NOTE: time is in milliseconds in this.myMatchContext; but videoDuration is in seconds
                // The integral percentage (i.e., 50 is halfway) based on milliseconds for time T,
                // duration D is (T * 100) / (D * 1000) which we simplify to T / (D * 10)
                percentValue = lastMatchTimeProcessed / (this.videoDurationInSeconds * 10);
                percentValue = Math.floor(percentValue);
                if (percentValue < 0)
                    percentValue = 0;
                else if (percentValue > 100)
                    percentValue = 100;
                matchLine.percentOffset = percentValue;
                this.videoMatches.push(matchLine);
            }
        }
    }

    // Helper function to bold match text in the transcript.  If there are no matches, then no text will get bolded.
    private ComputeTranscriptWithMatches() {
        var matchOffset: number;
        var matchEndOffset: number;
        var textWithBoldedMatches: string;
        var outOfBoundsOffset: number;
        var timingIndexToCheckFirst: number;

        if (this.myStory.transcript == null || this.myStory.transcript.length == 0) {
            this.transcriptTextBlock = "";
            return; // give up if there is no transcript
        }

        // NOTE: assumes this.myStory.timing.length >= 1

        // Pass 1: for every match BLAH, add in <b> and </b> markers around BLAH in transcript text.
        // As such inserts are done, update the offset numbers in this.myStory.timingPairs.  The plain transcript
        // will transform into textWithBoldedMatches.
        // Then, put this into the string used to populate the transcript area.

        // Pass 1: walk the matches from last one (greatest offset into transcript) to first...
        // Once a match is processed, never consider those characters again, i.e., even if match offsets
        // and scoring words somehow overlap/intermingle, the logic here will never allow for a case like
        // <b>ok here <b>bad, bold in bold</b></b> because the ending </b> of match N will never be placed
        // after the start <b> of match N+1.
        outOfBoundsOffset = this.myStory.transcript.length; // index transcriptText.length out of bounds (index transcriptText.length-1 still valid for length >= 1)
        textWithBoldedMatches = "";
        timingIndexToCheckFirst = this.myStory.timingPairs.length - 1; // working from end of transcript back to front, so start with last timing entry
        for (var iMatch: number = this.myMatchContext.length - 1; iMatch >= 0; iMatch--) {
            matchOffset = this.myMatchContext[iMatch].startOffset;
            matchEndOffset = this.myMatchContext[iMatch].endOffset;
            if (matchOffset < outOfBoundsOffset) { // there is room in text to highlight this match
                // NOTE: matchEndOffset might be one past the end of transcriptText, which is
                // ok for using it with transcriptText.substring(matchOffset, endingOffset):

                // TODO: The following sort of string appending construction may be time-consuming - re-implement later once the means
                // of transcript contruction with timing has been formalized (e.g., it may be replaced or augmented with closed-captioning).

                // We now have processed transcript from original offset matchOffset to its end.
                // We insert 3 characters at matchOffset and 4 more at matchEndOffset.
                if (matchEndOffset < outOfBoundsOffset) {
                    textWithBoldedMatches = "<b>" +
                        this.myStory.transcript.substring(matchOffset, matchEndOffset) + "</b>" +
                        this.myStory.transcript.substring(matchEndOffset, outOfBoundsOffset) + textWithBoldedMatches;
                }
                else { // the match extends to the end of this chunk being considered.
                    textWithBoldedMatches = "<b>" +
                        this.myStory.transcript.substring(matchOffset, matchEndOffset) + "</b>" + textWithBoldedMatches;
                }
                outOfBoundsOffset = matchOffset; // from match forward, no longer process (to avoid any overlapping issues)
                while (this.myStory.timingPairs[timingIndexToCheckFirst].offset >= matchOffset && timingIndexToCheckFirst > 0) {
                    timingIndexToCheckFirst--; // determine max number of timing entries to be checked for update based on <b>,</b> inserts
                }
                for (var iTiming = timingIndexToCheckFirst; iTiming < this.myStory.timingPairs.length; iTiming++) {
                    if (this.myStory.timingPairs[iTiming].offset > matchOffset) {
                        // Grow offset by 3 for <b> and perhaps an additional 4 for </b>
                        if (this.myStory.timingPairs[iTiming].offset >= matchEndOffset)
                            this.myStory.timingPairs[iTiming].offset += 7;
                        else
                            this.myStory.timingPairs[iTiming].offset += 3;
                    }
                    // else no offset adjustment needed for time entries at or before the matchOffset insert; e.g.,
                    // if match at "snow" and now we have <b>snow</b> keep timing offset pointed to start of <b>
                }
            }
        }
        if (this.myMatchContext.length > 0) {
            // Transcript from outOfBoundsOffset to end already processed.  Tack on any text
            // that precedes the first match.
            if (outOfBoundsOffset > 0)
                textWithBoldedMatches = this.myStory.transcript.substring(0, outOfBoundsOffset) + textWithBoldedMatches;
        }
        else {
            // With no matches, this.myStory.timingPairs[] is unchanged and textWithBoldedMatches == transcriptText
            textWithBoldedMatches = this.myStory.transcript;
        }

        // NOTE: at this point there has been no replacement of <br> for \n in textWithBoldedMatches, to simplify all the offset adjustments.
        var re = /\n/g;
        this.transcriptTextBlock = textWithBoldedMatches.replace(re,'<br>');
    }

    autoAdvanceToNext() {
        // If the user setting to "autoadvance" is true, and there is a next story, automatically advance to it
        if (this.defaultAutoAdvance) {
            if (this.myStory.nextStory != null && this.myStory.nextStory > 0) {
                this.gotoNewStory(this.myStory.nextStory);
            }
        }
    }

    gotoPrevStory() {
        if (this.myStory != null) {
            this.gotoNewStory(this.myStory.prevStory);
        }
    }

    gotoNextStory() {
        if (this.myStory != null) {
            this.gotoNewStory(this.myStory.nextStory);
        }
    }

    gotoPrevMatch() {
        // Go to the previous match before the given play time (or first match if no matches are before).
        var movieTimeInMSecs: number = this.videoPositionInSeconds * 1000;
        var matchIndexToSeekTo: number = this.myMatchContext.length - 1;
        for (var i = 0; i < this.myMatchContext.length; i++) {
            if (this.myMatchContext[i].time >= movieTimeInMSecs) {
                if (i == 0)
                    matchIndexToSeekTo = 0; // can't move earlier than first match
                else
                    matchIndexToSeekTo = i - 1;
                break;
            }
        }
        if (matchIndexToSeekTo >= 0) {
            var timeInSecs = this.myMatchContext[matchIndexToSeekTo].time / 1000; // convert milliseconds to seconds
            this.setPosition(timeInSecs);
        }
    }

    gotoNextMatch() {
        // Go to the next match after the given play time (or last match if no matches are after).
        var movieTimeInMSecs: number = this.videoPositionInSeconds * 1000;
        var matchIndexToSeekTo: number = 0;
        var lastMatchIndex: number = this.myMatchContext.length - 1;
        for (var i = lastMatchIndex; i >= 0; i--) {
            if (this.myMatchContext[i].time <= movieTimeInMSecs) {
                if (i == lastMatchIndex)
                    matchIndexToSeekTo = lastMatchIndex; // can't move later than last match
                else
                    matchIndexToSeekTo = i + 1;
                break;
            }
        }
        if (lastMatchIndex >= 0) {
            var timeInSecs = this.myMatchContext[matchIndexToSeekTo].time / 1000; // convert milliseconds to seconds
            this.setPosition(timeInSecs);
        }
    }

    setPosition(newValInSecs: number) {
        if (this.videoPlayerRef) {
            if (this.videoPositionInSeconds != newValInSecs) {
                // If prior to start, will go to 0; if past end, will go to end.
                this.videoPlayerRef.time = newValInSecs;
                this.videoPositionInSeconds = this.videoPlayerRef.time; // note: might not be newValInSecs if pushed into [0,end] range
            }
        }
    }

    gotoNewStory(givenNewStoryID: number) {
        if (givenNewStoryID != 0) { // there is a non-zero ID to navigate to: go there, bypassing sending additional routing details that we
            // collected in ngOnInit because we are NOT checking for match information/context for prev/next story chain.
            // These prev/next stories get loaded as if they came from NO query context at first (see ngOnInit()) but then if a
            // story is shown to come from a text search context, that context is established.

            // Clear current interface while next one is loading:
            this.storyDetailsTitle = ""; // NOTE: the informative "Loading..." that might show up 1/100 of time is probably worse than having 99/100 with no "flash" of text; choosing latter no-text...
            this.storyDetailsShortenedTitle = "";
            this.myStory = null;

            // If there is a transcript query context, pass that along so new story can also show matches to this query context.
            if (this.transcriptQuery && this.transcriptQuery.length > 0) {
                // NOTE: Story ID is *REQUIRED* and so is part of router.navigate path below (along with /story) rather than in moreQueryParams.
                var moreQueryParams = [];
                moreQueryParams['q'] = this.transcriptQuery;
                this.router.navigate(['/story', givenNewStoryID, moreQueryParams]);
            }
            else
                this.router.navigate(['/story', givenNewStoryID]);
        }
    }

    adjustVideoCurrentTime(eventArgs) {
        var movieTimeInSecs: number = this.videoPlayerRef.time;
        this.videoPositionInSeconds = movieTimeInSecs;
    }

    private ComputeTimesForOffsets() {
        // Use this.myStory.timingPairs and this.myStory.matchTerms to compute this.myMatchContext for each match in matchTerms
        var i: number = 0;
        var matchIndex: number = 0;
        var maxTimingPairIndex: number;
        var givenMatchesCount: number;
        var newEntry: TimedTextMatch;

        if (this.myStory.timingPairs == null)
            maxTimingPairIndex = -1;
        else
            maxTimingPairIndex = this.myStory.timingPairs.length - 1;
        if (this.myStory.matchTerms == null)
            givenMatchesCount = 0;
        else
            givenMatchesCount = this.myStory.matchTerms.length;

        if (givenMatchesCount == 0 || maxTimingPairIndex <= 0) {
            this.storyHasMatches = false;
            this.myMatchContext = [];
            return;
        }

        this.storyHasMatches = true;
        // As we move through this.myStory.timingPairs in ascending offset order, we don't go back,
        // i.e., i starts at 0 but moves forward within this outer while loop rather than being
        // reset to 0 each time:
        while (matchIndex < givenMatchesCount) {
            while (this.myStory.timingPairs[i].offset <= this.myStory.matchTerms[matchIndex].startOffset &&
                i <= maxTimingPairIndex)
                i++;
            // Offset at matchIndex lines up in time slot at i-1 (using 0 if i-1 == -1);
            // set the time attribute for matchInfo[] based on the stored offset value already there,
            // adjusting the time based on this.myStory.timingPairs.
            newEntry = new TimedTextMatch();
            newEntry.startOffset = this.myStory.matchTerms[matchIndex].startOffset;
            newEntry.endOffset = this.myStory.matchTerms[matchIndex].endOffset;

            if (i == 0)
                newEntry.time = this.myStory.timingPairs[0].time;
            else
                newEntry.time = this.myStory.timingPairs[i - 1].time;
            this.myMatchContext.push(newEntry);
            matchIndex++; // Note: service puts matches in order, so this.myStory.timingPairs[N+1].startOffset >= this.myStory.timingPairs[N].startOffset
        }
    }

    toggleAddToMyClips() {
        this.playlistManagerService.toggleAddToMyClips(this.myStory);
        this.storyInMyClips = (this.myClips.findIndex(x => x.storyID == this.myStory.storyID) >=0 );
        if (this.storyInMyClips)
            this.liveAnnouncer.announce("Added to play list"); // NOTE: using LiveAnnouncer rather than aria-live tag
        else
            this.liveAnnouncer.announce("Removed from play list"); // NOTE: using LiveAnnouncer rather than aria-live tag
    }

    toggleTranscriptDisplay() {
      this.isTranscriptShowing = !this.isTranscriptShowing;
      if (this.isTranscriptShowing) {
          this.toggleTranscriptLabel = "Hide Transcript";
      }
      else {
          this.toggleTranscriptLabel = "Show Transcript";
          this.mobileDetails = true; // when turning transcript off, force the mobile view to be showing Details, not Transcript, as Transcript is "hidden"
      }
    }

    mobileDetailsClick(newSetting: boolean) {
        // Set whether mobile view is showing Details tab (true setting) or Transcript tab (false setting).
        // Also, if showing Transcript then also make sure isTranscriptShowing is set to true (since caller wants to see the transcript).
        if (newSetting) {
            this.mobileDetails = true;
            // Leave isTranscriptShowing as is.
            this.haveEvidenceOfTranscriptInNarrowView = false; // no need to overcome an Angular Flex layout issue if transcript tab not active
        }
        else {
          this.haveEvidenceOfTranscriptInNarrowView = true; // needed to overcome an Angular Flex layout issue
          this.isTranscriptShowing = true;
          this.toggleTranscriptLabel = "Hide Transcript"; // same as in toggleTranscriptDisplay() logic for when isTranscriptShowing is true
          this.mobileDetails = false; // again, Details "false" means Transcript tab is on, which will also have a transcript with isTranscriptShowing true
        }
    }

    goBack($event: MouseEvent): void {
        $event.preventDefault();

        // !!!TBD!!! FYI, as needed this.routerHistoryService.previousUrl holds this route where we
        // head back to; see router-history for context and credit with RouterHistoryService sourced like WindowService

        this.windowService.nativeWindow.history.back();
    }
}
