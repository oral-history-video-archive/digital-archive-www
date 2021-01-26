import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { takeUntil } from "rxjs/operators";

import { ActivatedRoute, Router, Params } from '@angular/router';
import { BiographyStorySetService } from './biography-storyset.service';
import { HistoryMakerService } from '../historymakers/historymaker.service';
import { IDSearchService } from '../id-search/id-search.service';
import { TitleManagerService } from '../shared/title-manager.service';
import { SearchFormService } from '../shared/search-form/search-form.service';

import { StoryDocument} from '../storyset/story-document';
import { GlobalState } from '../app.global-state';
import { environment } from '../../environments/environment';

import { DetailedBiographyStorySet } from './detailed-biography-storyset';
import { BiographyFavorites } from '../story/biography-favorites';

import { SearchFormOptions } from '../shared/search-form/search-form-options';
import { BaseComponent } from '../shared/base.component';
import { USMapDistribution } from '../US-map/US-map-distribution';
import { SearchResult } from '../storyset/search-result';
import { USMapManagerService } from '../US-map/US-map-manager.service';
import { WindowService } from '../shared/services';
import { AnalyticsService } from '../ll-analytics.service';
import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title

@Component({
    selector: 'my-bio-storyset',
    templateUrl: './biography-storyset.component.html',
    styleUrls: ['./biography-storyset.component.scss']
})
export class BiographyStorySetComponent extends BaseComponent implements OnInit {
  @ViewChild('rg1Map') radioGroup1_Map: ElementRef;
  @ViewChild('rg1Text') radioGroup1_Text: ElementRef;
  @ViewChild('rg1Pic') radioGroup1_Pic: ElementRef;
  @ViewChild('rg2Map') radioGroup2_Map: ElementRef;
  @ViewChild('rg2Text') radioGroup2_Text: ElementRef;
  @ViewChild('rg2Pic') radioGroup2_Pic: ElementRef;

    signalFocusToTitle: boolean; // is used in html rendering of this component
    signalFocusToStoryID: number; // ID of the story, if any, that is selected in the story list

    myAccession: string;
    titleForEmptyStorySet: string = null; // only used for bogus parameter(s) resulting in empty data
    titleForCompletedStorySet: string = null; // one of this or titleForEmptyStorySet used for route's h1 element and html title

    isNonemptyContent: boolean = false;
    toggleDetailsLabel: string;
    tapeSummariesShown: boolean = false;
    bioDetailOpened: boolean = false;
    bioDescriptionOpened: boolean = false;

    tapeTitlesCache: string[] = []; // At client request, title the tape "chunk" in a particular way when tapeSummariesShown
    tapeSummariesCache: string[] = [];
    myStoryListByTape: StoryDocument[][];
    myStoryList: StoryDocument[];
    bioSessionDetails: string[] = [];

    USStateDistribution: USMapDistribution;

    bioDetail: DetailedBiographyStorySet;

    tailoredJobFamilyList: string;
    tailoredOccupationList: string;
    tailoredMakerGroupList: string;
    tailoredBirthDate: string;
    tailoredBirthLocation: string;
    tailoredDeceasedDate: string;
    tailoredImage: string;
    tailoredStoryCountInfo: string;
    biographyFavoriteColor: string;
    biographyFavoriteFood: string;
    biographyFavoriteTimeOfYear: string;
    biographyFavoriteVacationSpot: string;
    biographyFavoriteQuote: string;

    cardView: boolean = true;
    textView: boolean = false;

    private myMediaBase: string;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private globalState: GlobalState,
        private biographyStorySetService: BiographyStorySetService,
        private historyMakerService: HistoryMakerService,
        private idSearchService: IDSearchService,
        private titleManagerService: TitleManagerService,
        private myUSMapManagerService: USMapManagerService,
        private windowService: WindowService,
        private analyticsService: AnalyticsService,
        private userSettingsManagerService: UserSettingsManagerService,
        private searchFormService: SearchFormService, private liveAnnouncer: LiveAnnouncer) {

          super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)

          // Start off with an empty signal about what to focus on
          this.clearSignalsForCurrentFocusSetting();

          this.myMediaBase = environment.mediaBase;

          myUSMapManagerService.clickedRegionID$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
              this.filterOnUSMapRegion(value);
          });

          this.searchFormService.setSearchOptions(new SearchFormOptions(false, this.globalState.NOTHING_CHOSEN, this.globalState.NO_ACCESSION_CHOSEN, false)); // note: will likely be called again with a chosen bio ID
    }

    // NOTE: This component shows all the stories for a given biography.
    // A required argument is the biography ID (now a string accession value).
    ngOnInit() {
        this.route.params.forEach((params: Params) => {
            var titlePiece: string;

            this.titleForEmptyStorySet = null;
            this.titleForCompletedStorySet = null;
            this.titleManagerService.setTitle("Biography Story Set, Results Pending"); // placeholder until content load tried

            // NOTE:  ID is expected
            if (params['ID'] !== undefined) {
                this.myAccession = params['ID'];

                this.getBiographyResults(); // assumes this.myAccession already set
            }
            else { // never expected, i.e., we assume we will have a valid accession ID in this.myAccession, but just in case, clear out interface
                this.bioDetail = null;
                this.titleForEmptyStorySet = "Biography Story Set Empty (missing biography identifier)";
                this.titleForCompletedStorySet = null;
                this.titleManagerService.setTitle(this.titleForEmptyStorySet);
                this.liveAnnouncer.announce(this.titleForEmptyStorySet); // NOTE: using LiveAnnouncer to eliminate possible double-speak
            }
        });
    }

    // With optional city, state, and country specifiers, return a string of the form:
    // city or city, state or city, state, country or just state, country or just country or city, country, etc.
    private getBirthLocationString() {
        var workVal: string;
        var accumulatedVal: string = "";

        if (this.bioDetail.birthCity != null)
            accumulatedVal = this.bioDetail.birthCity.trim();

        if (this.bioDetail.birthState != null) {
            workVal = this.bioDetail.birthState.trim();
            if (workVal.length > 0) {
                if (accumulatedVal.length > 0)
                    accumulatedVal = accumulatedVal + ", " + workVal;
                else
                    accumulatedVal = workVal;
            }
        }

        if (this.bioDetail.birthCountry != null) {
            workVal = this.bioDetail.birthCountry.trim();
            if (workVal.length > 0) {
                if (accumulatedVal.length > 0)
                    accumulatedVal = accumulatedVal + ", " + workVal;
                else
                    accumulatedVal = workVal;
            }
        }
        return accumulatedVal;
    }

    private getBiographyResults() {
        this.biographyStorySetService.getStoriesInBiography(this.myAccession).pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
              bioDetail => {
                var oneSessionInterviewInfo: string;

                this.bioDetail = bioDetail;

                if (bioDetail != null) {
                    // NOTE:  Only now, with biography details loaded, can we log the item request, since the name of
                    // the person is within bioDetail which has just been loaded.
                    this.analyticsService.logBiographyLookupForCOUNTER(bioDetail.accession, bioDetail.preferredName);

                    this.searchFormService.setSearchOptions(new SearchFormOptions(false, bioDetail.biographyID, bioDetail.accession, false)); // let search form know we will search within this bio for stories

                    this.tailoredImage = this.myMediaBase + "biography/image/" + bioDetail.biographyID;
                    if (bioDetail.birthDate == null)
                        this.tailoredBirthDate = "";
                    else
                        this.tailoredBirthDate = this.globalState.cleanedMonthDayYear(bioDetail.birthDate);
                    if (bioDetail.deceasedDate == null)
                        this.tailoredDeceasedDate = "";
                    else
                        this.tailoredDeceasedDate = this.globalState.cleanedMonthDayYear(bioDetail.deceasedDate);
                    this.tailoredBirthLocation = this.getBirthLocationString();

                    var facetIndicators: string[] = [];
                    var i: number;
                    var oneFacetIndicator: string;

                    for (i = 0; i < bioDetail.occupationTypes.length; i++) {
                        oneFacetIndicator = bioDetail.occupationTypes[i];
                        facetIndicators.push(oneFacetIndicator);
                    }
                    this.EstablishFavoritesBlock(bioDetail.favorites);

                    this.tailoredJobFamilyList = null;
                    this.historyMakerService.getJobFamilyList(facetIndicators).pipe(takeUntil(this.ngUnsubscribe))
                      .subscribe(bioDetailJobList => {
                        this.tailoredJobFamilyList = bioDetailJobList;
                    });
                    facetIndicators = [];
                    for (i = 0; i < bioDetail.makerCategories.length; i++) {
                        oneFacetIndicator = bioDetail.makerCategories[i];
                        facetIndicators.push(oneFacetIndicator);
                    }
                    this.tailoredMakerGroupList = null;
                    this.historyMakerService.getMakerGroupList(facetIndicators).pipe(takeUntil(this.ngUnsubscribe))
                      .subscribe(bioDetailMakerGroupList => {
                        this.tailoredMakerGroupList = bioDetailMakerGroupList;
                    });

                    var oneStringFacet: string;
                    var collectedFacetList: string = "";
                    for (i = 0; i < bioDetail.occupations.length; i++) {
                        oneStringFacet = bioDetail.occupations[i];
                        if (oneStringFacet != null && oneStringFacet.trim().length > 0)
                            collectedFacetList += oneStringFacet + ", "; // use , as separator
                    }
                    if (collectedFacetList.length > 0)
                        this.tailoredOccupationList = collectedFacetList.substring(0, collectedFacetList.length - 2);
                    else
                        this.tailoredOccupationList = "";

                    // Update title with name (we may not have had it earlier) and story count.
                    // Compute specific format for tape titles as well, and cache the tape abstracts in string array tapeSummariesCache
                    // For each session holding information about an interview, make a string description of that interview, too.
                    // Finally, store StoryDocument records for each story into 2 forms of organization: a flat list (myStoryList), and a list
                    // of stories organized into each parent tape (myStoryListByTape), allowing quick easy toggling with readable html
                    // in the presentation layer.
                    this.tapeTitlesCache = [];
                    this.bioSessionDetails = [];
                    this.tapeSummariesCache = [];
                    this.myStoryList = [];
                    this.myStoryListByTape = [];
                    this.USStateDistribution = null;
                    var oneTapeStoryList: StoryDocument[] = [];
                    var storyCount: number = 0;
                    var oneStoryDocument: StoryDocument;
                    var IDListToLoad:string = ""; // see usage below to populate map data for the story set
                    for (i = 0; i < bioDetail.sessions.length; i++) {
                        oneSessionInterviewInfo = "Interviewed on " + this.globalState.cleanedMonthDayYear(bioDetail.sessions[i].interviewDate) + " by " +
                            bioDetail.sessions[i].interviewer + " at " + bioDetail.sessions[i].location + ", videographer " + bioDetail.sessions[i].videographer;
                        this.bioSessionDetails.push(oneSessionInterviewInfo);
                        for (var j = 0; j < bioDetail.sessions[i].tapes.length; j++) {
                            this.tapeTitlesCache.push("Tape " + bioDetail.sessions[i].tapes[j].tapeOrder + ", " +
                            this.globalState.cleanedMonthDayYear(bioDetail.sessions[i].interviewDate));
                            this.tapeSummariesCache.push(bioDetail.sessions[i].tapes[j].abstract);
                            oneTapeStoryList = [];
                            if (bioDetail.sessions[i].tapes[j].stories != null) {
                                storyCount += bioDetail.sessions[i].tapes[j].stories.length;
                                for (var k = 0; k < bioDetail.sessions[i].tapes[j].stories.length; k++) {
                                    oneStoryDocument = new StoryDocument();
                                    oneStoryDocument.duration = bioDetail.sessions[i].tapes[j].stories[k].duration;
                                    oneStoryDocument.storyID = bioDetail.sessions[i].tapes[j].stories[k].storyID;
                                    IDListToLoad += oneStoryDocument.storyID + ",";
                                    oneStoryDocument.title = bioDetail.sessions[i].tapes[j].stories[k].title;
                                    oneStoryDocument.storyOrder = bioDetail.sessions[i].tapes[j].stories[k].storyOrder;
                                    oneStoryDocument.accession = this.myAccession;
                                    oneStoryDocument.interviewDate = bioDetail.sessions[i].interviewDate;
                                    oneStoryDocument.sessionOrder = String(bioDetail.sessions[i].sessionOrder);
                                    oneStoryDocument.tapeOrder = String(bioDetail.sessions[i].tapes[j].tapeOrder);
                                    this.myStoryList.push(oneStoryDocument);
                                    oneTapeStoryList.push(oneStoryDocument);
                                }
                            }
                            this.myStoryListByTape.push(oneTapeStoryList);
                        }
                    }
                    if (IDListToLoad.length > 0)
                        IDListToLoad = IDListToLoad.substring(0, IDListToLoad.length - 1); // drop extraneous "," at end of nonempty list
                    var pendingTitle: string = bioDetail.preferredName;
                    var fragment: string;
                    if (pendingTitle != null && pendingTitle.length > 0)
                        pendingTitle += ", ";
                    else
                        pendingTitle = "";
                    if (storyCount != 1) {
                        fragment = storyCount + " Stories";
                    }
                    else {
                        fragment = "1 Story";
                    }
                    pendingTitle += fragment;
                    this.tailoredStoryCountInfo = fragment;

                    // !!!TBD!!! NOTE: Until the API is updated, US State information is NOT returned from the getStoriesInBiography service call
                    // for stories within a biography.  Make a separate call that will load up this information for the stories.  Also, this implies
                    // that for this view, for biography-storyset, there is no filtering: all the stories for this biography are included.
                    if (IDListToLoad.length > 0) {
                        this.idSearchService.getIDSearch(IDListToLoad, 1, this.myStoryList.length + 1)
                          .pipe(takeUntil(this.ngUnsubscribe)).subscribe(retSet => {
                            this.initializeUSStateCounts(bioDetail.preferredName, retSet); // harvest and use the entities/states facet to populate the US state region counts
                        },
                        error => { // give up on finding additional map information for the story set.
                            this.initializeUSStateCounts(bioDetail.preferredName, null); // effectively empties the map view of any story information
                        });
                    }

                    this.titleForEmptyStorySet = null; // not needed, redundant with information shown elsewhere
                    this.titleForCompletedStorySet = pendingTitle;
                    this.titleManagerService.setTitle(pendingTitle);
                    this.liveAnnouncer.announce(pendingTitle); // NOTE: using LiveAnnouncer to eliminate possible double-speak

                    this.isNonemptyContent = true;
                    this.toggleDetailsLabel = "Hide Summaries";
                    this.tapeSummariesShown = true; // default to showing them once loaded
                    this.setFocusAsNeeded(); // set focus once context and content fully loaded
                }
                else {
                    // No biography details available
                    this.tailoredImage = null;
                    this.tailoredBirthDate = "";
                    this.tailoredDeceasedDate = "";
                    this.tailoredJobFamilyList = null;
                    this.tailoredOccupationList = null;
                    this.tailoredMakerGroupList = null;
                    this.isNonemptyContent = false;
                    this.tapeSummariesShown = false;
                    this.ClearFavoritesBlock();
                }
              },
              error => {
                // TODO: perhaps add in more careful error processing with logging/analytics as needed
                this.setInterfaceForEmptyStorySet("");
              }
            );
    }

    private setFocusAsNeeded() {
        var focusSetElsewhere: boolean = false;

        // Check on scroll and focus to selected story item once everything is set up, but only do focus/scroll action
        // if focus is not set to something else above.
        var selectedItem: number = this.userSettingsManagerService.currentStoryIDToFocus();
        if (selectedItem != this.globalState.NOTHING_CHOSEN) {
            if (!focusSetElsewhere) {
                this.signalFocusToStoryID = selectedItem; // can focus to story item because nothing else was picked earlier
                focusSetElsewhere = true;
            }
            // Once used, or once something else was focused on via "focusSetElsewhere", clear it.
            this.userSettingsManagerService.updateStoryIDToFocus(this.globalState.NOTHING_CHOSEN);
        }
        this.userSettingsManagerService.updateMixtapeIDToFocus(this.globalState.NOTHING_CHOSEN); // forget/clear out mixtape selection as that is not this context
        // If any routes being returned back to have a way to put focus on this particular Maker (biography ID),
        // indicate that it should be done via a user setting "BioIDToFocus" since biography is this route's context:
        this.userSettingsManagerService.updateBioIDToFocus(this.myAccession);

        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            if (!focusSetElsewhere)
                // Set default focus to the title for this route, since we did internally route
                // in the SPA (single page application)
                // (as it is the target for skip-to-main content as well)
                this.signalFocusToTitle = true;
        }

        // If we used pending focus flags, here is where they would be reset, after signals are all in place: this.clearPendingFocusInstructions();
    }
    private clearSignalsForCurrentFocusSetting() {
        this.signalFocusToStoryID = this.globalState.NOTHING_CHOSEN;
        this.signalFocusToTitle = false;
    }

    private initializeUSStateCounts(ownerName: string, resultSet: SearchResult) {
        var postedDistribution: USMapDistribution = new USMapDistribution();

        postedDistribution.mapRegionListTitle = "U.S. State";
        postedDistribution.keyEntitySingular = "story";
        postedDistribution.keyEntityPlural = "stories";
        postedDistribution.verbLeadIn = "discuss";
        postedDistribution.verbLeadInSingular = "discusses";
        postedDistribution.verbPhrase = "Discussed in";
        if (ownerName && ownerName.length > 0) {
            postedDistribution.keyTitle = "States Mentioned in Stories for " + ownerName;
            postedDistribution.keySuffix = "from " + ownerName; // used to compose key message of form: "1 Story from Timuel Black" etc.
        }
        else {
            postedDistribution.keyTitle = "States Mentioned in One Person's Stories";
            postedDistribution.keySuffix = "from this person"; // used to compose key message of form: "20 Stories from this person" etc.
        }
        postedDistribution.exceptionDescription = null;

        if (resultSet)
            postedDistribution.keyEntitySetCount = resultSet.count;
        else
            postedDistribution.keyEntitySetCount = 0;

        postedDistribution.count = [];
        // Initially zero out the count.  Then, update if we have a resultSet
        for (var i = 0; i <= 51; i++)
            postedDistribution.count.push(0);
        if (resultSet && resultSet.facets && resultSet.facets.entityStates && resultSet.facets.entityStates.length > 0) {
            // Handle region (U.S. state):
            var oneFacetID: string;
            var oneFacetCount: number;
            var numericIndexForMap: number;
            for (i = 0; i < resultSet.facets.entityStates.length; i++) {
                oneFacetCount = resultSet.facets.entityStates[i].count;
                oneFacetID = resultSet.facets.entityStates[i].value; // two-letter code e.g., NY or PA or DC
                numericIndexForMap = this.globalState.MapIndexForUSState(oneFacetID);
                postedDistribution.count[numericIndexForMap] = oneFacetCount;
            }
        }
        this.USStateDistribution = postedDistribution;
    }

    // Set interface for empty results.  If no improvedTitle is given, use "No stories found." as the title.
    private setInterfaceForEmptyStorySet(improvedTitle: string) {
        if (improvedTitle == null || improvedTitle.length == 0)
            this.titleForEmptyStorySet = "No stories found";
        else
            this.titleForEmptyStorySet = improvedTitle;
        this.titleForCompletedStorySet = null;
        this.titleManagerService.setTitle(this.titleForEmptyStorySet + " | Biography Story Set");
        this.liveAnnouncer.announce("Empty Biography Story Set"); // NOTE: using LiveAnnouncer to eliminate possible double-speak
        this.isNonemptyContent = false;
        this.tapeSummariesShown = false;
    }

    filterOnUSMapRegion(chosenUSMapRegionID: string) {
        // In this particular interface, given region can never be already picked, so just filter on the given region.
        // A route like .../storiesForBio;ID=A2006.075 is same as route like
        // .../stories/2;q=*;pg=1;pgS=30;ip=6101;ia=A2006.075 which can turn into a filtered-to-one-region route of:
        // .../stories/2;ffu=1;pgS=30;spec=----VA---;q=*;sT=0;sS=0;ip=6101;ia=A2006.075;pg=1 or simplied to:
        // .../stories/2;spec=----VA---;q=*;ip=6101;ia=A2006.075
        if (chosenUSMapRegionID && chosenUSMapRegionID.length == 2) {
            // Only continue with 2-letter US Map Region IDs...
            var moreParams = {};

            moreParams['ia'] = this.myAccession;
            moreParams['ip'] = this.bioDetail.biographyID;
            moreParams['q'] = "*"; // return ALL stories for this biography ID
            moreParams['spec'] = "----" + chosenUSMapRegionID + "---";
            // !!!TBD!!! This knowledge of the length for the filter specification is something that could be fixed by centralizing search filtering!

            this.clearSignalsForCurrentFocusSetting(); // forget signals before launching router navigation
            this.router.navigate(['/stories/2', moreParams]);
        }
    }

    goBack($event: MouseEvent): void {
        $event.preventDefault();

        // !!!TBD!!! FYI, as needed this.routerHistoryService.previousUrl holds this route where we
        // head back to; see router-history for context and credit with RouterHistoryService sourced like WindowService

        this.windowService.nativeWindow.history.back();
    }

    toggleDetails() {
        if (this.tapeSummariesShown) {
            this.tapeSummariesShown = false;
            this.toggleDetailsLabel = "Show Summaries";
        }
        else {
            this.tapeSummariesShown = true;
            this.toggleDetailsLabel = "Hide Summaries";
        }
    }

    private EstablishFavoritesBlock(givenFavs: BiographyFavorites) {
        var candidate: string;

        this.ClearFavoritesBlock(); // have favorites empty unless we get valid content

        if (givenFavs.color != null) {
            candidate = givenFavs.color.trim();
            if (this.IsAcceptableAnswer(candidate))
                this.biographyFavoriteColor = candidate;
        }

        if (givenFavs.food != null) {
            candidate = givenFavs.food.trim();
            if (this.IsAcceptableAnswer(candidate))
                this.biographyFavoriteFood = candidate;
        }

        if (givenFavs.timeOfYear != null) {
            candidate = givenFavs.timeOfYear.trim();
            if (this.IsAcceptableAnswer(candidate))
                this.biographyFavoriteTimeOfYear = candidate;
        }

        if (givenFavs.vacationSpot != null) {
            candidate = givenFavs.vacationSpot.trim();
            if (this.IsAcceptableAnswer(candidate))
                this.biographyFavoriteVacationSpot = candidate;
        }

        if (givenFavs.quote != null) {
            candidate = givenFavs.quote.trim();
            if (this.IsAcceptableAnswer(candidate))
                this.biographyFavoriteQuote = candidate;
        }
    }

    private IsAcceptableAnswer(candidate: string): boolean {
        const NOT_ASKED_MARKER: string = "not asked";
        const NOT_ANSWERED_MARKER: string = "none";
        const NOT_APPLICABLE_MARKER: string = "n/a";
        var candidateToTest = candidate.toLowerCase();
        return (candidateToTest.length > 0 && candidateToTest != NOT_ASKED_MARKER && candidateToTest != NOT_ANSWERED_MARKER &&
              candidateToTest != NOT_APPLICABLE_MARKER);
    }

    private ClearFavoritesBlock() {
        this.biographyFavoriteColor = null;
        this.biographyFavoriteFood = null;
        this.biographyFavoriteTimeOfYear = null;
        this.biographyFavoriteVacationSpot = null;
        this.biographyFavoriteQuote = null;
    }

    public setViewOptions(eventCode: string, comingFromPicOption: boolean, comingFromTextOption: boolean) {
        if (comingFromPicOption) {
            // Next is text, back is map, current is pic grid.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewOption(false, true); // set "text"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewOption(false, false); // set "map"
            else if (eventCode == " " || eventCode == "Enter") {
                this.cardView = true;
                this.textView = false;
            }
        }
        else if (comingFromTextOption) {
            // Next is map, back is pic, current is text.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewOption(false, false); // set "map"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewOption(true, false); // set "pic"
            else if (eventCode == " " || eventCode == "Enter") {
                this.cardView = false;
                this.textView = true;
            }
        }
        else {
            // Next is pic, back is text, current is map.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewOption(true, false); // set "pic"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewOption(false, true); // set "text"
            else if (eventCode == " " || eventCode == "Enter") {
                this.cardView = false;
                this.textView = false;
            }
        }
    }

    public setViewOptionsInNarrowContainer(eventCode: string, comingFromPicOption: boolean, comingFromTextOption: boolean) {
        if (comingFromPicOption) {
            // Next is text, back is map, current is pic grid.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewInNarrowContainer(false, true); // set "text"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewInNarrowContainer(false, false); // set "map"
            else if (eventCode == " " || eventCode == "Enter") {
                this.cardView = true;
                this.textView = false;
            }
        }
        else if (comingFromTextOption) {
            // Next is map, back is pic, current is text.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewInNarrowContainer(false, false); // set "map"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewInNarrowContainer(true, false); // set "pic"
            else if (eventCode == " " || eventCode == "Enter") {
                this.cardView = false;
                this.textView = true;
            }
        }
        else {
            // Next is pic, back is text, current is map.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewInNarrowContainer(true, false); // set "pic"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewInNarrowContainer(false, true); // set "text"
            else if (eventCode == " " || eventCode == "Enter") {
                this.cardView = false;
                this.textView = false;
            }
        }
    }

    private focusPicViewInNarrowContainer(settingPicStampFocus: boolean, settingTextStampFocus: boolean) {
        if (settingPicStampFocus) { // set focus to radioGroup1_Pic
            if (this.radioGroup1_Pic && this.radioGroup1_Pic.nativeElement)
                this.radioGroup1_Pic.nativeElement.focus();
        }
        else if (settingTextStampFocus) { // set focus to radioGroup1_Text
            if (this.radioGroup1_Text && this.radioGroup1_Text.nativeElement)
                this.radioGroup1_Text.nativeElement.focus();
        }
        else { // set focus to radioGroup1_Map
            if (this.radioGroup1_Map && this.radioGroup1_Map.nativeElement)
                this.radioGroup1_Map.nativeElement.focus();
        }
    }

    private focusPicViewOption(settingPicStampFocus: boolean, settingTextStampFocus: boolean) {
        if (settingPicStampFocus) { // set focus to radioGroup2_Pic
            if (this.radioGroup2_Pic && this.radioGroup2_Pic.nativeElement)
                this.radioGroup2_Pic.nativeElement.focus();
        }
        else if (settingTextStampFocus) { // set focus to radioGroup2_Text
            if (this.radioGroup2_Text && this.radioGroup2_Text.nativeElement)
                this.radioGroup2_Text.nativeElement.focus();
        }
        else { // set focus to radioGroup2_Map
            if (this.radioGroup2_Map && this.radioGroup2_Map.nativeElement)
                this.radioGroup2_Map.nativeElement.focus();
        }
    }
}
