import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { takeUntil } from "rxjs/operators";

import { ActivatedRoute, Router, Params } from '@angular/router';
import { HistoryMakerService } from '../historymakers/historymaker.service';
import { TitleManagerService } from '../shared/title-manager.service';
import { Story } from './story';
import { StorySetType} from './storyset-type';
import { TextSearchService } from '../text-search/text-search.service';
import { IDSearchService } from '../id-search/id-search.service';
import { TagService } from '../tag/tag.service';
import { SearchFormService } from '../shared/search-form/search-form.service';
import { PlaylistManagerService } from '../playlist-manager/playlist-manager.service'
import { SearchableFacetSpecifier } from './searchable-facet-specifier';
import { SearchResult } from './search-result';
import { StorySearchSortField } from './story-search-sort-field';
import { StoryFacets } from './story-facets';

import { Mixtape } from '../mixtape-stamp/mixtape';

import { Facets } from '../historymakers/facets';
import { FacetDetail, FacetFamilyContainer } from '../historymakers/facet-detail';
import { StoryFilterFamilyType, StoryFilterFamilyTypeCount, StoryFacetWithFamily } from './storyfilterfamily-type';

import { GlobalState } from '../app.global-state';
import { environment } from '../../environments/environment';
import { Playlist } from '../playlist-manager/playlist';

import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';

import { SearchFormOptions } from '../shared/search-form/search-form-options';
import { BaseComponent } from '../shared/base.component';

import { BiographyStorySetService } from '../biography-storyset/biography-storyset.service';
import { USMapDistribution } from '../US-map/US-map-distribution';
import { USMapManagerService } from '../US-map/US-map-manager.service';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title, e.g., instead of
// <h2 aria-live="assertive" aria-atomic="true" class="sr-only">{{whateverSetTitle}}</h2> ...which sometimes was double-read by screen readers.
// Angular folks recognized this and added in a timer to take care of it in their LiveAnnouncer implementation.

@Component({
    selector: 'my-storyset',
    templateUrl: './storyset.component.html',
    styleUrls: ['./storyset.component.scss']
})
export class StorySetComponent extends BaseComponent implements OnInit {
  @ViewChild('rg1Map') radioGroup1_Map: ElementRef;
  @ViewChild('rg1Text') radioGroup1_Text: ElementRef;
  @ViewChild('rg1Pic') radioGroup1_Pic: ElementRef;
  @ViewChild('rg2Map') radioGroup2_Map: ElementRef;
  @ViewChild('rg2Text') radioGroup2_Text: ElementRef;
  @ViewChild('rg2Pic') radioGroup2_Pic: ElementRef;

    readonly MAX_REGION_US_STATES_TO_SHOW_IN_FILTER_AREA:number = 10; // need data from all 50+DC for map view, but don't show all 51, just the top N

    titleForStorySet: string; // includes a count
    screenReaderSummaryTitle: string; // abbreviated form (no count, paging, etc., given in this summary)

    cardView: boolean = true;
    textView: boolean = false;

    signalFocusToStoryID: number = -1;
    signalFocusToRemoveFilterButtonIndicator: number = -1;
    signalFocusToFirstShownFamily: boolean[];
    signalFocusToPageOne: boolean = false;
    signalFocusToFinalPage: boolean = false;
    signalFocusToCloseFilterButton: boolean = false;
    signalFocusToOpenFilterButton: boolean = false;
    signalFocusToTitle: boolean; // is used in html rendering of this component

    // !!!TBD!!! REVISIT how to signal where focus should go after contents are all refreshed.
    private pending_storyFilterFamily: StoryFilterFamilyType = StoryFilterFamilyType.None;
    private pending_storyFilterValue: string = "";
    private pending_removeFilterButtonIndicator: number = -1;
    private pending_focusToFirstShownFilterFamily: boolean = false;
    private pending_focusOnPageOneButton: boolean = false;
    private pending_focusOnFinalPageButton: boolean = false;
    private pending_focusOnCloseFilterButton: boolean = false;
    private pending_focusOnOpenFilterButton: boolean = false;

    myID: number;
    myFullNameAddOn: string;
    myCurrentQuery: string;
    myCurrentSearchTitleOnlyFlag: boolean;
    myCurrentSearchTranscriptOnlyFlag: boolean;
    myCurrentSearchParentBiographyID: number;
    myCurrentSearchParentAccession: string;
    myCurrentSearchParentPreferredName: string = ""; // gets filled in perhaps by a service if we get a myCurrentSearchParentAccession
    myCurrentTitleForTextSearchPending: boolean = false; // used when negotiating use of 2 services filling out pieces of title (see myCurrentSearchParentPreferredName)
    myCurrentInterviewYearRangeFilter: string;
    myCurrentPage: number = 1;
    myCurrentFilterSpec: string = "";

    public myCurrentPageSize: number;
    public myModelledPageSize: number;

    totalStoriesFoundSuffix: string;
    myStoryList: Story[];
    totalStoriesFound: number; // a count that may be more than the "kept" page of stories in myStoryList
    fullResultSetTitleSuffix: string; // cached information about the full result set used in constructing title

    USStateDistribution: USMapDistribution;

    myType: StorySetType = StorySetType.None; // gets assigned in ngOnInit via router params
    transcriptQueryContext: string = null; // gets assigned in ngOnInit via router params

    pages: number[] = [];
    lastPageInSet: number = 0;
    needPrevPage: boolean = false;
    needNextPage: boolean = false;
    needToggleDetails: boolean = false;
    showingFilterMenu: boolean = false; // changes the display of the page: filters on side with other items, or just filters in a menu

    // NOTE:  terminology has not been updated in the code: the UI will make note of a specific saved set of stories as "My Clips" while code here
    // still notes this as "Starred Stories" -- despite the UI changing from star to plus to add a story to My Clips.  Take note: starred means "my clips."
    showingStarredSet: boolean = false; // needed to gate extra UI for starred stories, i.e., my clips marked set of stories

    myClips: Playlist[];

    toggleDetailsLabel: string;

    selectedStoryID: number; // ID of the story, if any, that is selected in the story list
    isSortableSet: boolean = false; // used to control visibility of sort options

    // NOTE: REVISIT THIS BECAUSE WE HAVE ASSUMPTIONS HERE ON EXACTLY 8 FACET GROUPS IN PARTICULAR FORMS.  MVC works for facets, but are not coded for extensibility at this point!!!
    // NOTE: facet groups are not the same for biographies and stories: with biographies there is a lastInitial facet for example.
    facetFamilies: FacetFamilyContainer[] = []; // initialized once, in constructor, so there is entry for each of the StoryFilterFamilyType values
    activeFacets: StoryFacetWithFamily[] = [];

    // TODO: Later consider whether to have each story set type (starred, mixtapes, etc.) in its own component,
    // inheriting perhaps the base story set features of paging, titling, etc.  For now, all story sets except a single biography's story set
    // are here in this StorySet component.

    // Another "particular" set of features, for mixtape:
    mixtapes: Mixtape[];
    mixtapeSetID: number = 0;
    mixtapeAuthor: string = "";
    mixtapeTitle: string = "";
    mixtapeAbstract: string = "";
    // ...and something in common with mixtape and given ID lists:
    givenIDList: string = "";
    IDListTitle: string;

    // Sorting
    storySearchSortFields: StorySearchSortField[];
    myCurrentStorySearchSorting: number; // indicator on the sorting in use

    minYearAllowed: number;

    showStoryUSStateFacetFilter: boolean;
    showStoryOrganizationFacetFilter: boolean;
    showStoryDecadeFacetFilter: boolean;
    showStoryYearFacetFilter: boolean;
    showStoryJobTypeFacetFilter: boolean;
    showStoryDecadeOfBirthFacetFilter: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public globalState: GlobalState,
        private historyMakerService: HistoryMakerService,
        private textSearchService: TextSearchService,
        private idSearchService: IDSearchService,
        private tagService: TagService,
        private titleManagerService: TitleManagerService,
        private userSettingsManagerService: UserSettingsManagerService,
        private searchFormService: SearchFormService,
        private biographyStorySetService: BiographyStorySetService,
        private liveAnnouncer: LiveAnnouncer,
        private myUSMapManagerService: USMapManagerService,
        private playlistManagerService: PlaylistManagerService) {

        super(); // since this is a derived class from BaseComponent

        // Set up data structure for facet families.
        this.initializeFacetFamilies();

        // Start off with an empty signal about what to focus on (done after facet families initialized)
        this.clearSignalsForCurrentFocusSetting();

        this.myCurrentPageSize = this.globalState.StoryPageSize;
        this.myModelledPageSize = this.myCurrentPageSize;
        this.totalStoriesFound = 0;
        this.selectedStoryID = this.globalState.NOTHING_CHOSEN;

        this.titleForStorySet = "HistoryMaker Story Set";
        this.screenReaderSummaryTitle = "HistoryMaker Story Set";

        myUSMapManagerService.clickedRegionID$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.filterOnUSMapRegion(value);
        });

        // NOTE: these pipes assume this.facetFamilies already initialized (via this.initializeFacetFamilies()).
        userSettingsManagerService.showStoryDecadeFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[StoryFilterFamilyType.DecadeInStory].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showStoryYearFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[StoryFilterFamilyType.YearInStory].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showStoryUSStateFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[StoryFilterFamilyType.StateInStory].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showStoryOrganizationFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[StoryFilterFamilyType.Organization].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showStoryJobTypeFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[StoryFilterFamilyType.JobType].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showStoryDecadeOfBirthFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].isAllowedToBeShown = value;
        });

        this.mixtapes = environment.mixtapes;
        this.minYearAllowed = environment.firstInterviewYear;

        this.searchFormService.setSearchOptions(new SearchFormOptions(false, this.globalState.NOTHING_CHOSEN, this.globalState.NO_ACCESSION_CHOSEN, false));

        playlistManagerService.myClips$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.myClips = value;
            if (this.showingStarredSet) {
                this.getIDListStoriesPage(this.playlistManagerService.MyClipsAsString(), this.myCurrentPage, this.myCurrentPageSize);
            }
        });
    }

    private initializeFacetFamilies() {
        var oneFamilyContainer: FacetFamilyContainer;
        // Get signalling set up and cleared regarding focus movement.
        for (var i = 0; i < StoryFilterFamilyTypeCount; i++) {
            oneFamilyContainer = new FacetFamilyContainer();
            this.facetFamilies.push(oneFamilyContainer);
        }
        // Initialize each family, with "None" not really used.
        this.facetFamilies[StoryFilterFamilyType.None].facets = null;
        this.facetFamilies[StoryFilterFamilyType.None].isAllowedToBeShown = false; // always false
        this.facetFamilies[StoryFilterFamilyType.None].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.None].title = "N/A";
        this.facetFamilies[StoryFilterFamilyType.None].nameForLabel = "";
        this.facetFamilies[StoryFilterFamilyType.None].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.None].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.Category].facets = [];
        this.facetFamilies[StoryFilterFamilyType.Category].isAllowedToBeShown = true; // always shown
        this.facetFamilies[StoryFilterFamilyType.Category].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.Category].title = "Category";
        this.facetFamilies[StoryFilterFamilyType.Category].nameForLabel = "Category";
        this.facetFamilies[StoryFilterFamilyType.Category].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.Category].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.Gender].facets = [];
        this.facetFamilies[StoryFilterFamilyType.Gender].isAllowedToBeShown = true; // always shown
        this.facetFamilies[StoryFilterFamilyType.Gender].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.Gender].title = "Gender";
        this.facetFamilies[StoryFilterFamilyType.Gender].nameForLabel = "Gender";
        this.facetFamilies[StoryFilterFamilyType.Gender].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.Gender].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.StateInStory].facets = [];
        this.facetFamilies[StoryFilterFamilyType.StateInStory].isAllowedToBeShown = false; // changes with userSettingsManagerService.showStoryUSStateFacetFilter
        this.facetFamilies[StoryFilterFamilyType.StateInStory].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.StateInStory].title = "U.S. State";
        this.facetFamilies[StoryFilterFamilyType.StateInStory].nameForLabel = "U.S. State";
        this.facetFamilies[StoryFilterFamilyType.StateInStory].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.StateInStory].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.Organization].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.Organization].isAllowedToBeShown = false; // changes with userSettingsManagerService.showStoryOrganizationFacetFilter
        this.facetFamilies[StoryFilterFamilyType.Organization].title = "Organization";
        this.facetFamilies[StoryFilterFamilyType.Organization].nameForLabel = "Organization";
        this.facetFamilies[StoryFilterFamilyType.Organization].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.Organization].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.DecadeInStory].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.DecadeInStory].isAllowedToBeShown = false; // changes with userSettingsManagerService.showStoryDecadeFacetFilter
        this.facetFamilies[StoryFilterFamilyType.DecadeInStory].title = "Decade";
        this.facetFamilies[StoryFilterFamilyType.DecadeInStory].nameForLabel = "Decade";
        this.facetFamilies[StoryFilterFamilyType.DecadeInStory].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.DecadeInStory].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.YearInStory].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.YearInStory].isAllowedToBeShown = false; // changes with userSettingsManagerService.showStoryYearFacetFilter
        this.facetFamilies[StoryFilterFamilyType.YearInStory].title = "Year";
        this.facetFamilies[StoryFilterFamilyType.YearInStory].nameForLabel = "Year";
        this.facetFamilies[StoryFilterFamilyType.YearInStory].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.YearInStory].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.JobType].facets = [];
        this.facetFamilies[StoryFilterFamilyType.JobType].isAllowedToBeShown = false; // changes with userSettingsManagerService.showStoryJobTypeFacetFilter
        this.facetFamilies[StoryFilterFamilyType.JobType].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.JobType].title = "Job Type";
        this.facetFamilies[StoryFilterFamilyType.JobType].nameForLabel = "Job";
        this.facetFamilies[StoryFilterFamilyType.JobType].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.JobType].signalFocusToFamilyParent = false;

        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].facets = [];
        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].isAllowedToBeShown = false; // changes with userSettingsManagerService.showStoryDecadeOfBirthFacetFilter
        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].isOpened = false;
        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].title = "Decade of Birth";
        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].nameForLabel = "Decade of Birth";
        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].signalItemToFocus = "";
        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].signalFocusToFamilyParent = false;
    }

    // Here is the definitive list for routing based on story set type:
    // (For all types:  type for type, pg for page, pgS for page size, sID for selected story ID (what to highlight/page into view, if anything).)
    // ---
    // StorySetType.BiographyCollection: (formerly here, but now moved to its own component, biography-storyset as it held other info)
    // ---
    // StorySetType.StarredSet:
    // Needed:  A cached list of starred stories in a global state (see playlistManagerService).
    // ---
    // StorySetType.GivenIDSet:
    // Needed:  Comma-separated ID list as parameter IDList required.
    // ---
    // StorySetType.Mixtape:
    // Needed:  Comma-separated ID list as parameter IDList required, along with mixSetID parameter to "describe" the mix tape set.
    // ---
    // StorySetType.TextSearch:
    // Needed: q for query.
    // ---
    // StorySetType.TagSearch:
    // Needed: q for query which is actually a comma-separated list of tag identifiers.
    //
    // Furthermore, the notice that this route should be showing a filter menu interface exclusively is controlled by another route argument:
    // menu ('1' for on, anything else or no argument at all for off)
    ngOnInit() {
        // NOTE: this lead-in code is not called if only the arguments change for the page /stories/args -- see params.forEach for when parameters change.
        this.facetFamilies[StoryFilterFamilyType.StateInStory].isAllowedToBeShown = this.userSettingsManagerService.currentShowStoryUSStateFacetFilter();
        this.facetFamilies[StoryFilterFamilyType.DecadeInStory].isAllowedToBeShown = this.userSettingsManagerService.currentShowStoryDecadeFacetFilter();
        this.facetFamilies[StoryFilterFamilyType.YearInStory].isAllowedToBeShown = this.userSettingsManagerService.currentShowStoryYearFacetFilter();
        this.facetFamilies[StoryFilterFamilyType.Organization].isAllowedToBeShown = this.userSettingsManagerService.currentShowStoryOrganizationFacetFilter();
        this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].isAllowedToBeShown = this.userSettingsManagerService.currentShowStoryDecadeOfBirthFacetFilter();
        this.facetFamilies[StoryFilterFamilyType.JobType].isAllowedToBeShown = this.userSettingsManagerService.currentShowStoryJobTypeFacetFilter();

        this.setStorySearchSortFieldOptions();
        this.myCurrentStorySearchSorting = this.globalState.StorySearchSortingPreference;
        this.myClips = this.playlistManagerService.initializeMyClips();

        this.route.params.forEach((params: Params) => {
            var givenPageSize: number = this.globalState.StoryPageSize;
            var givenPageIndicator: number = 1;
            var isFilterForcedUpdate: boolean = false;

            if (params['ffu'] !== undefined && params['ffu'] == "1")
                isFilterForcedUpdate = true;

            // Support paging across all types as well:
            if (params['pg'] !== undefined) {
                var candidatePageIndicator = +params['pg'];
                if (candidatePageIndicator != null && candidatePageIndicator > 0)
                    givenPageIndicator = candidatePageIndicator; // 1-based indicator used, so first page is at page 1
            }
            if (params['pgS'] !== undefined) {
                var candidatePageSize = +params['pgS'];
                if (candidatePageSize != null && candidatePageSize > 0)
                    givenPageSize = candidatePageSize;
            }

            // Determine if filter-menu option is on or not
            if (params['menu'] !== undefined && !isNaN(+params['menu']))
                this.showingFilterMenu = (+params['menu'] == 1);
            else
                this.showingFilterMenu = false;

            this.needToggleDetails = false;

            // Determine current "state" of the page (remember, this code "fires" if only parameters change) to see if there is really a need for lots of work,
            // e.g., for getting a new fetch of HistoryMakers meeting some criteria.  It may be, for example, that the filter menu was opened, adjusted little or
            // nothing, and now closes, and there is not really a need for any fetch of different HistoryMakers because the criteria remained the same.
            // So, do NOT change the this.___ state of things yet (aside from this.showingFilterMenu):
            // first collect the "new" state of things for a comparison...
            var newCurrentQuery: string = null;
            var sortOrderChanged: boolean = false;
            var searchStoryTitleOnlyFlag: boolean = this.globalState.SearchTitleOnly;
            var searchStoryTranscriptOnlyFlag: boolean = this.globalState.SearchTranscriptOnly;
            var interviewYearFilterToUse: string = "";
            var anticipatedMapView: boolean = !this.cardView; // NOTE: doing it this way so that this.cardView = true will be a default state
            var anticipatedTextView: boolean = this.textView;
            var anticipatedParentBiographyIDForSearch: number = this.globalState.NOTHING_CHOSEN;
            var anticipatedParentAccessionForSearch = this.globalState.NO_ACCESSION_CHOSEN;
            var newSpec: string = "";

            if (params['spec'] !== undefined) {
                newSpec = params['spec'];
                if (newSpec.trim().length == 0)
                    newSpec = ""; // up front throw out an all-whitespace spec as a non-spec signified by empty string
            }
            // else newSpec remains ""

            if (params['mv'] != undefined && params['mv'] == "1") {
                anticipatedMapView = true;
                anticipatedTextView = false;
            }
            else {
                anticipatedMapView = false;

                if (params['tv'] != undefined && params['tv'] == "1") {
                    anticipatedTextView = true;
                }
                else {
                    anticipatedTextView = false;
                }
            }

            if (params['so'] !== undefined  && !isNaN(+params['so'])) {
                var candidateSortOrder:number = +params['so'];
                if (candidateSortOrder >= 0 && candidateSortOrder < this.storySearchSortFields.length) {
                  sortOrderChanged = this.updateStorySearchSorting(candidateSortOrder);
                }
            }

            // Based on anticipatedType, check for certain parameters to determine if story set content/context changes.
            // If so, there will be more work to refresh/refill the story set; if not, such as on a view-only change from
            // text to map perhaps, then less work will be done.
            // NOTE: the required "type" is part of the route (see storyset.routing.ts for how this value gets the "type" key).
            var anticipatedType: StorySetType = params['type']; // e.g., StorySetType.TextSearch for text query, etc.
            var refreshNeededBasedOnStorySetTypeInfoUpdate: boolean = false; // long-winded name to track when specific storyset type parameters change significantly

            if (anticipatedType == StorySetType.Mixtape) {
                var anticipatedMixTapeID: number = 0;
                if (params['mixSetID'] !== undefined && !isNaN(+params['mixSetID'])) {
                    anticipatedMixTapeID = +params['mixSetID'];
                if (anticipatedMixTapeID != this.mixtapeSetID) {
                    refreshNeededBasedOnStorySetTypeInfoUpdate = true; // insist on full refresh later!
                    this.mixtapeSetID = anticipatedMixTapeID;
                    this.mixtapeTitle = "";
                    this.mixtapeAuthor = "";
                    this.mixtapeAbstract = "";
                    this.givenIDList = "";                }

                    // If this ID is in our set of mixtapes, continue on with that detail....
                    for (var i = 0; i < this.mixtapes.length; i++) {
                        if (this.mixtapes[i].mixSetID == anticipatedMixTapeID) {
                            this.mixtapeAuthor = "Curated by " + this.mixtapes[i].curator;
                            this.mixtapeTitle = this.mixtapes[i].title;
                            this.mixtapeAbstract = this.mixtapes[i].description;
                            this.givenIDList = this.mixtapes[i].storyIDListAsCSV;
                            break; // have a match, so exit the loop
                        }
                    }
                }
            }
            else if (anticipatedType == StorySetType.TextSearch) {
                if (params['sT'] !== undefined)
                    searchStoryTitleOnlyFlag = (params['sT'] == "1");
                if (params['sS'] !== undefined)
                    searchStoryTranscriptOnlyFlag = (params['sS'] == "1");
                // Also allow additional interview year filtering (which may be empty, i.e., not used)
                if (params['iy'] !== undefined)
                    interviewYearFilterToUse = params['iy'];

                if (params['ip'] !== undefined && !isNaN(+params['ip']) && params['ia'] !== undefined) {
                    // Set up for a search "inside of a person" i.e., just that person's stories can be returned.
                    anticipatedParentBiographyIDForSearch = +params['ip'];
                    anticipatedParentAccessionForSearch = params['ia'];
                }

                if (searchStoryTitleOnlyFlag != this.myCurrentSearchTitleOnlyFlag || searchStoryTranscriptOnlyFlag != this.myCurrentSearchTranscriptOnlyFlag ||
                  interviewYearFilterToUse != this.myCurrentInterviewYearRangeFilter ||
                  anticipatedParentBiographyIDForSearch != this.myCurrentSearchParentBiographyID ||
                  anticipatedParentAccessionForSearch != this.myCurrentSearchParentAccession) {
                    refreshNeededBasedOnStorySetTypeInfoUpdate = true; // insist on full refresh later!
                    this.myCurrentSearchTitleOnlyFlag = searchStoryTitleOnlyFlag;
                    this.myCurrentSearchTranscriptOnlyFlag = searchStoryTranscriptOnlyFlag;
                    this.myCurrentInterviewYearRangeFilter = interviewYearFilterToUse;
                    // Set search context arguments regarding parent (i.e., search within one person) to match was is in parameters line
                    this.myCurrentSearchParentBiographyID = anticipatedParentBiographyIDForSearch;
                    this.myCurrentSearchParentAccession = anticipatedParentAccessionForSearch;
                }

                // NOTE:  q is expected; logic appears below to back out of text search if newCurrentQuery == ""
                if (params['q'] !== undefined)
                    newCurrentQuery = params['q'];
                else
                    newCurrentQuery = "";
            }
            else if (anticipatedType == StorySetType.TagSearch) {
                // NOTE:  q is expected; logic appears below to back out of tag search if newCurrentQuery == ""
                if (params['q'] !== undefined)
                    newCurrentQuery = params['q'];
                else
                    newCurrentQuery = "";
            }

            if (isFilterForcedUpdate || refreshNeededBasedOnStorySetTypeInfoUpdate || this.myType != anticipatedType ||
                sortOrderChanged || newCurrentQuery != this.myCurrentQuery ||
                this.myCurrentPage != givenPageIndicator || this.myCurrentPageSize != givenPageSize ||
                this.specStringFromActiveFacets() != newSpec) {
                // A re-fetch of story set is needed because context changed in some way.
                // Update context in this... for query and page state and view (with sort order already updated and noted via sortOrderChanged)
                this.myType = anticipatedType;
                this.transcriptQueryContext = null;
                this.showingStarredSet = (anticipatedType == StorySetType.StarredSet);
                this.myCurrentFilterSpec = newSpec;

                this.myCurrentQuery = newCurrentQuery;
                this.textView = anticipatedTextView;
                if (anticipatedTextView)
                    this.cardView = false;
                else
                    this.cardView = !anticipatedMapView;

                if (anticipatedType == StorySetType.Mixtape)
                    this.getMixtapePage(this.givenIDList, givenPageIndicator, givenPageSize);
                else if (anticipatedType == StorySetType.StarredSet || anticipatedType == StorySetType.GivenIDSet) {
                    // If this.showingStarredSet, then ID list is via playlistManagerService.
                    // Else, ID list is via parameter IDList.
                    var IDListToLoad: string;
                    if (this.showingStarredSet) {
                        IDListToLoad = this.playlistManagerService.MyClipsAsString();
                    }
                    else {
                        if (params['IDList'] !== undefined) {
                            IDListToLoad = params['IDList'];
                        }
                        else
                            IDListToLoad = "";
                    }
                    this.givenIDList = IDListToLoad;
                    if (params['ListTitle'] !== undefined)
                        this.IDListTitle = decodeURIComponent(params['ListTitle']);
                    // NOTE: for empty ID list, logic exists within getIDListStoriesPage to report "none yet" message;
                    // it makes use of this.showingStarredSet:
                    this.getIDListStoriesPage(IDListToLoad, givenPageIndicator, givenPageSize);
                }
                else if (this.myType == StorySetType.TagSearch) {
                    if (this.myCurrentQuery == null || this.myCurrentQuery.trim().length == 0) {
                        this.myCurrentQuery = null;
                        this.setInterfaceForEmptyStorySet(givenPageSize, "");
                    }
                    else
                        this.getTagSearchResultsPage(givenPageIndicator, givenPageSize);
                }
                else if (this.myType == StorySetType.TextSearch) {
                    // Rest of search context already set earlier, e.g., this.myCurrentQuery to newCurrentQuery,
                    // this.myCurrentSearchParentBiographyID to an ID of a person to search into, etc.
                    if (this.myCurrentQuery == null || this.myCurrentQuery.trim().length == 0) {
                        this.myCurrentQuery = null;
                        this.setInterfaceForEmptyStorySet(givenPageSize, "");
                    }
                    else {
                        // TODO: Decide if further routing or interface support is needed when a search within stories of a given person is done.
                        // It may be enough to see only results from one person to cue in what happened, so for now no other interface titling/cues are used.
                        if (this.myCurrentSearchParentBiographyID != this.globalState.NOTHING_CHOSEN) {
                            // Do a search "inside of a person" i.e., just that person's stories can be returned.
                            this.getTextSearchResultsPage(givenPageIndicator, givenPageSize);

                            // Also, get some details on the person to allow for more than just a default "one person" when describing
                            // results as in "No stories found matching within one person: query" or "8 stories matching within one person: query"
                            this.biographyStorySetService.getStoriesInBiography(this.myCurrentSearchParentAccession).pipe(takeUntil(this.ngUnsubscribe))
                            .subscribe(
                              bioDetail => {
                                  if (bioDetail != null) {
                                      this.myCurrentSearchParentPreferredName = bioDetail.preferredName;
                                      this.UpdatePageTitle(givenPageIndicator, givenPageSize);
                                  }
                                  else {
                                      // No biography details available, so leave as is with generic "one person" used when this.myCurrentSearchParentPreferredName == ""
                                      this.myCurrentSearchParentPreferredName = "";
                                  }
                                },
                                error => {
                                  // No biography details retrievable, so back out of getting a better label
                                  this.myCurrentSearchParentPreferredName = "";
                                }
                            );
                        }
                        else // no search inside a person, just a regular text search across all stories
                            this.getTextSearchResultsPage(givenPageIndicator, givenPageSize);
                    }
                }
            }
            else if (this.textView != anticipatedTextView || (!this.textView && (this.cardView == anticipatedMapView))) {
                // Either text view should be toggled, or it is off and the card view should be toggled (which also toggles the map view since text view is off)
                this.updateViewOptions(!anticipatedMapView, anticipatedTextView); // changes titling, etc., based on changed view
            }
            else {
                // Contents and context in hand already: check if there is any pending focus signalling to follow
                // to focus a new element (e.g., from close filter button to open filter button or vice versa).
                this.setFocusAsNeeded();
            }
        });
    }

    private getMixtapePage(mixtapeStoryIDList: string, givenPage: number, givenPageSize: number) {
        if (mixtapeStoryIDList.length > 0) {
            // NOTE: Mixtapes will be revisited and perhaps they will not be allowed to be sorted or paged (or perhaps even filtered).
            // If that is the case, they will remain separate from the other consumer of this.idSearchService.getIDSearch: getIDListStoriesPage.
            // If they continue to use sorting/paging/filtering as does getIDListStoriesPerPage, then these two calls
            // getIDListStoriesPage and getMixtapePage are candidates to merge (future TODO: consider merge of getIDListStoriesPage and getMixtapePage).
            var titleLabelStoryModifier: string = "";

            this.totalStoriesFound = 0; // typically is reassigned later with a service subscription
            this.titleForStorySet = "Searching... (in progress)";
            this.screenReaderSummaryTitle = "HistoryMaker Story Set, Search Pending";

            var searchableFacetSpec: SearchableFacetSpecifier = this.computeFacetArguments(this.myCurrentFilterSpec);
            var addFilterPrefixToMapKey:boolean = this.nonEmptyFacetSpecification(searchableFacetSpec);
            if (addFilterPrefixToMapKey)
                titleLabelStoryModifier = "filtered ";
            titleLabelStoryModifier += "\"Mixtape\"";

            this.selectedStoryID = this.globalState.NOTHING_CHOSEN; // assume we have no stories so no selected stories

            this.idSearchService.getIDSearch(mixtapeStoryIDList, givenPage, givenPageSize,
                searchableFacetSpec.genderFacetSpec, searchableFacetSpec.birthDecadeFacetSpec, searchableFacetSpec.makerFacetSpec,
                searchableFacetSpec.jobFacetSpec, searchableFacetSpec.regionUSStateFacetSpec, searchableFacetSpec.organizationFacetSpec,
                searchableFacetSpec.namedDecadeFacetSpec, searchableFacetSpec.namedYearFacetSpec)
                .pipe(takeUntil(this.ngUnsubscribe)).subscribe(retSet => {
                    this.globalState.matchSetContext = null; // no match terms for matching on story IDs
                    this.isSortableSet = false; // no sorting on ID lists
                    this.myStoryList = this.thinToGivenPage(retSet.stories, givenPage, givenPageSize);
                    if (this.myStoryList != null) {
                        this.totalStoriesFound = retSet.count;
                    }
                    else {
                        this.totalStoriesFound = 0;
                    }
                    this.initializeUSStateCounts(addFilterPrefixToMapKey);


                    this.calcTitleAndEnablePaging(givenPage, givenPageSize, titleLabelStoryModifier, ", " + this.mixtapeTitle);
                    this.processFacetsFromService(this.totalStoriesFound, retSet.facets, searchableFacetSpec);
                    // Finally, focus can be set because we have our context and content.
                    this.setFocusAsNeeded();
                },
                error => {
                    // TODO: Decide if further error logging/analytics is desired on fail-to-load cases like this
                    this.setInterfaceForEmptyStorySet(givenPageSize, "");
                });
        }
        else {
            this.setInterfaceForEmptyStorySet(givenPageSize, "No stories.");
        }
    }

    private initializeUSStateCounts(addFilterPrefixToMapKey: boolean) {
        var postedDistribution: USMapDistribution = new USMapDistribution();
        postedDistribution.mapRegionListTitle = "U.S. State";
        if (addFilterPrefixToMapKey) {
            postedDistribution.keyTitle = "States Mentioned in Filtered Stories";
            postedDistribution.keyEntitySingular = "filtered story";
            postedDistribution.keyEntityPlural = "filtered stories";
        }
        else {
            postedDistribution.keyTitle = "States Mentioned in Stories";
            postedDistribution.keyEntitySingular = "story";
            postedDistribution.keyEntityPlural = "stories";
        }
        postedDistribution.verbLeadIn = "discuss";
        postedDistribution.verbLeadInSingular = "discusses";
        postedDistribution.verbPhrase = "Discussed in";
        postedDistribution.keySuffix = "";
        postedDistribution.exceptionDescription = null;
        postedDistribution.keyEntitySetCount = 0; // update later when this.USStateDistribution region counts are updated
        postedDistribution.count = [];
        for (var i = 0; i <= 51; i++)
            postedDistribution.count.push(0);
        this.USStateDistribution = postedDistribution;
    }

    thinToGivenPage(givenStories: Story[], givenPage: number, givenPageSize: number): Story[] {
        var retSet:Story[] = givenStories;
        if (retSet != null) {
            // Possibly thin down based on the paging information.

            // Want to keep items 0 to givenSize - 1 if on page 1, givenSize to (givenSize*2) - 1 if on page 2, ...,
            // i.e., keeping items (givenPage - 1) * givenPageSize to (givenPage * givenPageSize) - 1
            if (givenPage < 1 || (givenPage - 1) * givenPageSize >= retSet.length)
                retSet = null; // clear out results - page data invalid or is past the number of results we have
            else {
                retSet = givenStories.slice((givenPage - 1) * givenPageSize, givenPage * givenPageSize);
            }
        }
        return retSet;
    }

    public updateViewOptions(newPicOptionSetting: boolean, newTextOptionSetting: boolean) {
        if (this.cardView != newPicOptionSetting || this.textView != newTextOptionSetting) {
            this.cardView = newPicOptionSetting;
            this.textView = newTextOptionSetting;
            // Update title, which is dependent on this.cardView and this.textView:
            this.initTitleForPage();
        }
    }

    public setViewOptionsInFilterMenu(eventCode: string, comingFromPicOption: boolean, comingFromTextOption: boolean) {
        if (comingFromPicOption) {
            // Next is text, back is map, current is pic grid.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewInFilterMenuOption(false, true); // set "text"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewInFilterMenuOption(false, false); // set "map"
            else if (eventCode == " " || eventCode == "Enter")
                this.updateViewOptions(true, false);
        }
        else if (comingFromTextOption) {
            // Next is map, back is pic, current is text.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewInFilterMenuOption(false, false); // set "map"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewInFilterMenuOption(true, false); // set "pic"
            else if (eventCode == " " || eventCode == "Enter")
                this.updateViewOptions(false, true);
        }
        else {
            // Next is pic, back is text, current is map.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewInFilterMenuOption(true, false); // set "pic"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewInFilterMenuOption(false, true); // set "text"
            else if (eventCode == " " || eventCode == "Enter")
                this.updateViewOptions(false, false);
        }
    }

    public setViewOptions(eventCode: string, comingFromPicOption: boolean, comingFromTextOption: boolean) {
        if (comingFromPicOption) {
            // Next is text, back is map, current is pic grid.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewOption(false, true); // set "text"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewOption(false, false); // set "map"
            else if (eventCode == " " || eventCode == "Enter")
                this.updateViewOptions(true, false);
        }
        else if (comingFromTextOption) {
            // Next is map, back is pic, current is text.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewOption(false, false); // set "map"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewOption(true, false); // set "pic"
            else if (eventCode == " " || eventCode == "Enter")
                this.updateViewOptions(false, true);
        }
        else {
            // Next is pic, back is text, current is map.
            if (eventCode == "ArrowDown" || eventCode == "ArrowRight")
                this.focusPicViewOption(true, false); // set "pic"
            else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft")
                this.focusPicViewOption(false, true); // set "text"
            else if (eventCode == " " || eventCode == "Enter")
                this.updateViewOptions(false, false);
        }
    }

    private focusPicViewInFilterMenuOption(settingPicStampFocus: boolean, settingTextStampFocus: boolean) {
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

    openMyExportMyClipsModalForm() {
        if (this.myStoryList && this.myStoryList.length > 0)
            // extra check to only bother with an export if there is something to export
            this.playlistManagerService.triggerMyClipsExportForm();
    }

    openMyClearMyClipsModalForm() {
      if (this.myStoryList && this.myStoryList.length > 0)
          // extra check to only bother with confirmation of clearing My Clips if there is something to clear
          this.playlistManagerService.triggerMyClipsConfirmClearingForm();
    }

    private getIDListStoriesPage(IDListToLoad: string, givenPage: number, givenPageSize: number) {
        // NOTE: assumes this.showingStarredSet is true iff id list is to be considered a "starred" set.
        // Override title if it is true.
        if (this.showingStarredSet) {
            this.titleForStorySet = "My Clips";
            this.screenReaderSummaryTitle = "My Clips";
        }
        if (IDListToLoad.length > 0) {
            if (!this.showingStarredSet) {
                this.titleForStorySet = "Searching... (in progress)";
                this.screenReaderSummaryTitle = "HistoryMaker Story Set, Search Pending";
            }

            var titleLabelStoryModifier: string = "";
            this.totalStoriesFound = 0; // typically is reassigned later with a service subscription

            var searchableFacetSpec: SearchableFacetSpecifier = this.computeFacetArguments(this.myCurrentFilterSpec);
            var addFilterPrefixToMapKey:boolean = this.nonEmptyFacetSpecification(searchableFacetSpec);
            if (addFilterPrefixToMapKey)
                titleLabelStoryModifier = "filtered ";
            if (this.showingStarredSet)
                titleLabelStoryModifier += "\"My Clips\"";

            this.selectedStoryID = this.globalState.NOTHING_CHOSEN; // assume we have no stories so no selected stories
            this.idSearchService.getIDSearch(IDListToLoad, givenPage, givenPageSize,
                searchableFacetSpec.genderFacetSpec, searchableFacetSpec.birthDecadeFacetSpec, searchableFacetSpec.makerFacetSpec,
                searchableFacetSpec.jobFacetSpec, searchableFacetSpec.regionUSStateFacetSpec, searchableFacetSpec.organizationFacetSpec,
                searchableFacetSpec.namedDecadeFacetSpec, searchableFacetSpec.namedYearFacetSpec)
                .pipe(takeUntil(this.ngUnsubscribe)).subscribe(retSet => {
                    this.globalState.matchSetContext = null; // no match terms for matching on story IDs
                    this.isSortableSet = false; // no sorting on ID lists
                    this.myStoryList = this.thinToGivenPage(retSet.stories, givenPage, givenPageSize);
                    if (this.myStoryList != null) {
                        this.totalStoriesFound = retSet.count;
                    }
                    else {
                        this.totalStoriesFound = 0;
                    }
                    this.initializeUSStateCounts(addFilterPrefixToMapKey);
                    this.calcTitleAndEnablePaging(givenPage, givenPageSize, titleLabelStoryModifier, "");
                    this.processFacetsFromService(this.totalStoriesFound, retSet.facets, searchableFacetSpec);
                    // Finally, focus can be set because we have our context and content.
                    this.setFocusAsNeeded();
                },
                error => { // give up
                    this.setInterfaceForEmptyStorySet(givenPageSize, "");
                });
        }
        else {
            var msg: string;
            if (this.showingStarredSet)
                msg = '0 "My Clips" stories'; // make sure this is consistent with title string format used elsewhere with this.showingStarredSet
            else
                msg = "No story IDs were given, so no stories shown."
            this.setInterfaceForEmptyStorySet(givenPageSize, msg);
        }
    }

    private setFocusAsNeeded() {
        var focusSetElsewhere: boolean = false;

        if (this.pending_focusOnPageOneButton) {
            this.signalFocusToPageOne = true;
            focusSetElsewhere = true;
        }
        else if (this.pending_focusOnFinalPageButton) {
            this.signalFocusToFinalPage = true;
            focusSetElsewhere = true;
        }
        else if (this.pending_focusOnCloseFilterButton) {
            this.signalFocusToCloseFilterButton = true;
            focusSetElsewhere = true;
        }
        else if (this.pending_focusOnOpenFilterButton) {
            this.signalFocusToOpenFilterButton = true;
            focusSetElsewhere = true;
        }
        else if (this.pending_removeFilterButtonIndicator >= 0 &&
            this.hasActiveFacet()) {
            if (this.pending_removeFilterButtonIndicator >= this.activeFacets.length)
                this.signalFocusToRemoveFilterButtonIndicator = this.activeFacets.length - 1;
            else
                this.signalFocusToRemoveFilterButtonIndicator = this.pending_removeFilterButtonIndicator;
            focusSetElsewhere = true;
        }
        else if (this.pending_focusToFirstShownFilterFamily) {
            for (var i = 0; i < StoryFilterFamilyTypeCount; i++) {
                if (this.facetFamilies[i].isAllowedToBeShown && this.facetFamilies[i].facets && this.facetFamilies[i].facets.length > 0) {
                    // Found one to focus!  Set its flag.
                    this.facetFamilies[i].signalFocusToFamilyParent = true;
                    focusSetElsewhere = true;
                    break; // focus on first one only, of course, so break out of loop
                }
            }
        }
        else if (this.pending_storyFilterFamily != StoryFilterFamilyType.None &&
          this.pending_storyFilterValue != "") {
            // Signal that the filter within this family with value pending_storyFilterValue is to be focused.
            this.facetFamilies[this.pending_storyFilterFamily].signalItemToFocus = this.pending_storyFilterValue;

            focusSetElsewhere = true;
        }

        // Check on scroll and focus to selected story item once everything is set up, but only do focus/scroll action
        // if focus is not set to something else above.
        var selectedItem: number = this.userSettingsManagerService.currentStoryIDToFocus();
        if (selectedItem != this.globalState.NOTHING_CHOSEN) {
            if (!focusSetElsewhere) {
                this.signalFocusToStoryID = selectedItem; // can focus to story item because nothing else was picked earlier
                focusSetElsewhere = true;
            }

            // Once used, or once something else was focused on via "focusSetElsewhere", clear the story id to focus.
            this.userSettingsManagerService.updateStoryIDToFocus(this.globalState.NOTHING_CHOSEN);
        }

        // Forget some signalling to other routes, given this context of "Story Set" such as there is no selected biography.
        this.userSettingsManagerService.updateBioIDToFocus(this.globalState.NO_ACCESSION_CHOSEN); // no single biography context

        if (this.myType == StorySetType.Mixtape && this.mixtapeSetID > 0) {
            // Leave breadcrumb in settings so we can signal with focus as needed which
            // mixtape originated this set of stories (e.g., on going back to sets of mixtape sets)
            this.userSettingsManagerService.updateMixtapeIDToFocus(this.mixtapeSetID);
        }
        else
            this.userSettingsManagerService.updateMixtapeIDToFocus(this.globalState.NOTHING_CHOSEN); // no mixtape context

        // Finally, if focus is not set earlier, do so now to the title as a default:
        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            if (!focusSetElsewhere) {
                // Set default focus to the title for this route, since we did internally route
                // in the SPA (single page application)
                // (as it is the target for skip-to-main content as well)
                this.signalFocusToTitle = true;
            }
        }

        this.clearPendingFocusInstructions();
    }

    private clearPendingFocusInstructions() {
        // Clean up "pending" status so that it will not leak into any future pending/routing/signalling activity.
        // This is the "pending" which changes signals for what to focus on, not the signals themselves which need to remain
        // so that upon component construction the right control gets focused.  Clearing signals happens right before route navigation.
        // Clearing "pending" happens after the pending instructions are all considered.
        this.pending_focusOnPageOneButton = false;
        this.pending_focusOnFinalPageButton = false;
        this.pending_focusOnOpenFilterButton = false;
        this.pending_focusOnCloseFilterButton = false;
        this.pending_removeFilterButtonIndicator = -1;
        this.pending_focusToFirstShownFilterFamily = false;
        this.pending_storyFilterFamily = StoryFilterFamilyType.None;
        this.pending_storyFilterValue = "";
    }

    private computeFacetArguments(filterSpecToUse: string): SearchableFacetSpecifier {
        // Very specific helper function, where given argument is a dash-separated N-value list with N == SearchableFacetSpecifier.FACET_COUNT if not empty
        // for gender, maker, job, birth decade, region (U.S. state), organization facet specifications, etc.  If given argument does not parse as such or is empty,
        // return an empty SearchableFacetSpecifier with all fields set to "".
        var retVal: SearchableFacetSpecifier = new SearchableFacetSpecifier();
        retVal.genderFacetSpec = ""; // default each individual spec to empty
        retVal.makerFacetSpec = "";
        retVal.jobFacetSpec = "";
        retVal.birthDecadeFacetSpec = "";
        retVal.regionUSStateFacetSpec = "";
        retVal.organizationFacetSpec = "";
        retVal.namedDecadeFacetSpec = "";
        retVal.namedYearFacetSpec = "";

        if (filterSpecToUse.length > 0) {
            var filterPieces: string[] = filterSpecToUse.split("-");
            if (filterPieces.length == SearchableFacetSpecifier.FACET_COUNT) {
                retVal.genderFacetSpec = filterPieces[0];
                retVal.makerFacetSpec = filterPieces[1];
                retVal.jobFacetSpec = filterPieces[2];
                retVal.birthDecadeFacetSpec = filterPieces[3];
                retVal.regionUSStateFacetSpec = filterPieces[4];
                retVal.organizationFacetSpec = filterPieces[5];
                retVal.namedDecadeFacetSpec = filterPieces[6];
                retVal.namedYearFacetSpec = filterPieces[7];
            }
        }
        return retVal;
    }

    private suffixForTitleLabel(): string {
        var retVal: string = "";

        if (this.myCurrentInterviewYearRangeFilter != null) {
            var readableDateRange: string = this.readableStringForInterviewYearRange();
            if (readableDateRange.length > 0)
              retVal += " interviewed " + readableDateRange; // date range made sense, so use it
        }
        if (this.myCurrentQuery != null && this.myCurrentQuery.length > 0 && this.myCurrentQuery != "*") {
            retVal += " matching";
            if (this.myCurrentSearchTitleOnlyFlag)
                retVal += " in title";
            else if (this.myCurrentSearchTranscriptOnlyFlag)
                retVal += " in transcript";

            if (this.myCurrentSearchParentBiographyID != this.globalState.NOTHING_CHOSEN)
            {
                if (this.myCurrentSearchParentPreferredName != "")
                    retVal += " within " + this.myCurrentSearchParentPreferredName;
                else
                    retVal += " within one person";
            }
            retVal += ": " + this.myCurrentQuery;
        }
        else {
            // Even without a query, there could be the "within" a person modifier, as in search all stories * within a person perhaps with filters
            if (this.myCurrentSearchParentBiographyID != this.globalState.NOTHING_CHOSEN)
            {
                if (this.myCurrentSearchParentPreferredName != "")
                    retVal += " within " + this.myCurrentSearchParentPreferredName;
                else
                    retVal += " within one person";
            }
        }
        return retVal;
    }

    private UpdatePageTitle(givenPage: number, givenPageSize: number) {
        if (this.myCurrentTitleForTextSearchPending)
            return; // do not stomp on ongoing work within getTextSearchResultsPage to title the page based on text search that's pending

        // NOTE:  assumes range for givenPage is legal: [1, maxPagesNeeded].
        var titleLabelStoryModifier: string = "";
        var searchableFacetSpec: SearchableFacetSpecifier = this.computeFacetArguments(this.myCurrentFilterSpec);
        if (this.nonEmptyFacetSpecification(searchableFacetSpec))
            titleLabelStoryModifier = "filtered";
        var titleLabelSuffix: string = this.suffixForTitleLabel();

        this.calcTitleAndEnablePaging(givenPage, givenPageSize, titleLabelStoryModifier, titleLabelSuffix);
    }

    private getTextSearchResultsPage(givenPage: number, givenPageSize: number) {

        this.myCurrentTitleForTextSearchPending = true;
        this.titleForStorySet = "Searching... (in progress)";
        this.screenReaderSummaryTitle = "HistoryMaker Story Set, Search Pending";

        // NOTE:  assumes range for givenPage is legal: [1, maxPagesNeeded].
        // Assumes myCurrentQuery are set appropriately to do the query as expected.
        // Also, myCurrentSearchTitleOnlyFlag and myCurrentSearchTranscriptOnlyFlag and myCurrentSearchParentBiographyID
        // and myCurrentInterviewYearRangeFilter.
        var titleLabelStoryModifier: string = "";
        var titleLabelSuffix: string = "";
        var searchableFacetSpec: SearchableFacetSpecifier = this.computeFacetArguments(this.myCurrentFilterSpec);
        var addFilterPrefixToMapKey:boolean = this.nonEmptyFacetSpecification(searchableFacetSpec);
        if (addFilterPrefixToMapKey)
            titleLabelStoryModifier = "filtered";
        this.IDListTitle = null;

        this.totalStoriesFound = 0; // typically is reassigned later with a service subscription

        var sortField:string = ""; // empty string will result in no sort field being used
        var sortInDescendingOrder: boolean = false; // actually will be ignored with an empty sortField

        if (this.globalState.StorySearchSortingPreference >= 0 && this.globalState.StorySearchSortingPreference < this.storySearchSortFields.length) {
            sortField = this.storySearchSortFields[this.globalState.StorySearchSortingPreference].sortField;
            sortInDescendingOrder = this.storySearchSortFields[this.globalState.StorySearchSortingPreference].sortInDescendingOrder;
        }

        this.selectedStoryID = this.globalState.NOTHING_CHOSEN; // assume we have no stories so no selected stories

        this.textSearchService.getTextSearch(this.myCurrentQuery, this.myCurrentInterviewYearRangeFilter, this.myCurrentSearchParentBiographyID,
            this.myCurrentSearchTitleOnlyFlag, this.myCurrentSearchTranscriptOnlyFlag, givenPage, givenPageSize,
            searchableFacetSpec.genderFacetSpec, searchableFacetSpec.birthDecadeFacetSpec, searchableFacetSpec.makerFacetSpec,
            searchableFacetSpec.jobFacetSpec, searchableFacetSpec.regionUSStateFacetSpec, searchableFacetSpec.organizationFacetSpec,
            searchableFacetSpec.namedDecadeFacetSpec, searchableFacetSpec.namedYearFacetSpec, sortField, sortInDescendingOrder)
          .pipe(takeUntil(this.ngUnsubscribe)).subscribe(retSet => {
            this.globalState.matchSetContext = retSet; // others may check for scoring terms, match character offsets to scoring terms, etc.
            this.myStoryList = retSet.stories;
            if (this.myStoryList != null) {
                this.totalStoriesFound = retSet.count;

                // Only bother with possibly setting a search context for non-empty results (even if filtering is why results are empty).
                if (this.myCurrentSearchTranscriptOnlyFlag || !this.myCurrentSearchTitleOnlyFlag)
                    this.transcriptQueryContext = this.myCurrentQuery; // search is not just to title, and so by definition (if both flags false) includes transcript
                else
                    this.transcriptQueryContext = null;
            }
            else {
                this.totalStoriesFound = 0;
                this.transcriptQueryContext = null;
            }
            this.initializeUSStateCounts(addFilterPrefixToMapKey);

            titleLabelSuffix = this.suffixForTitleLabel();

            this.isSortableSet = true; // allow sort interface on the text-search result set
            this.calcTitleAndEnablePaging(givenPage, givenPageSize, titleLabelStoryModifier, titleLabelSuffix);

            this.processFacetsFromService(this.totalStoriesFound, retSet.facets, searchableFacetSpec);

            this.myCurrentTitleForTextSearchPending = false;
            // Finally, focus can be set because we have our context and content.
            this.setFocusAsNeeded();
          },
          error => {
              // TODO: Decide if further error logging/analytics is desired on fail-to-load cases like this
              this.setInterfaceForEmptyStorySet(givenPageSize, "");
        });
    }

    private readableStringForInterviewYearRange(): string {
        // Use this.myCurrentInterviewYearRangeFilter to determine a readable interview date range.  If not possible, return "".
        var retVal: string = "";
        if (this.myCurrentInterviewYearRangeFilter.length == 9 && this.myCurrentInterviewYearRangeFilter[4] == "-") {
            // Have xxxx-xxxx as expected.  If each xxxx parses to a valid date, output an appropriate string.
            var earlyYear: number = 0;
            var lateYear: number = 0;
            var workString: string = this.myCurrentInterviewYearRangeFilter.substring(0, 4);
            if (!isNaN(+workString)) {
                earlyYear = +workString;
                workString = this.myCurrentInterviewYearRangeFilter.substring(5, 9);
                if (!isNaN(+workString)) {
                    lateYear = +workString;
                    if (lateYear == earlyYear)
                        retVal = "in " + earlyYear;
                    else {
                        if (earlyYear >= this.minYearAllowed) {
                            // NOTE:  We invest one call, new Data().getYear(), to pretty up the display of the interview date range.
                            var currentYear: number = new Date().getFullYear();
                            if (lateYear == currentYear)
                                retVal = "in or after " + earlyYear;
                            else
                                retVal = "between " + earlyYear + " and " + lateYear;
                        }
                        else
                            retVal = "in or before " + lateYear;
                    }
                }
            }
        }

        return retVal;
    }

    private nonEmptyFacetSpecification(givenFacetSpecifier: SearchableFacetSpecifier): boolean {
        return (givenFacetSpecifier != null && (givenFacetSpecifier.genderFacetSpec.length > 0 || givenFacetSpecifier.makerFacetSpec.length > 0 ||
              givenFacetSpecifier.jobFacetSpec.length > 0 || givenFacetSpecifier.birthDecadeFacetSpec.length > 0 ||
              givenFacetSpecifier.regionUSStateFacetSpec.length != 0 || givenFacetSpecifier.organizationFacetSpec.length != 0 ||
              givenFacetSpecifier.namedDecadeFacetSpec.length != 0 || givenFacetSpecifier.namedYearFacetSpec.length != 0));
    }

    private processFacetsFromService(totalCount: number, returnedFacets: StoryFacets, givenFacetSpec: SearchableFacetSpecifier) {
        var i: number;

        for (i = 0; i < StoryFilterFamilyTypeCount; i++)
            this.facetFamilies[i].facets = []; // start off with empty facets across all families

        this.activeFacets = [];
        if (returnedFacets === null)
            return; // nothing else to do
        if (givenFacetSpec === null)
            return; // nothing else to do)

        var oneFacet: FacetDetail;
        // Handle gender; be picky and allow only one gender in genderFacetSpec, "F" or "M", to be recognized:
        for (i = 0; i < returnedFacets.gender.length; i++) {
            if (returnedFacets.gender[i].value == "F") {
                oneFacet = new FacetDetail();
                oneFacet.value = this.globalState.FEMALE_MARKER;
                oneFacet.ID = this.globalState.FEMALE_ID;
                oneFacet.count = returnedFacets.gender[i].count;
                if (givenFacetSpec.genderFacetSpec == "F") oneFacet.active = true;
                this.facetFamilies[StoryFilterFamilyType.Gender].facets.push(oneFacet);
            }
            else if (returnedFacets.gender[i].value == "M") {
                oneFacet = new FacetDetail();
                oneFacet.value = this.globalState.MALE_MARKER;
                oneFacet.ID = this.globalState.MALE_ID;
                oneFacet.count = returnedFacets.gender[i].count;
                if (givenFacetSpec.genderFacetSpec == "M") oneFacet.active = true;
                this.facetFamilies[StoryFilterFamilyType.Gender].facets.push(oneFacet);
            }
        }
        // Handle maker:
        var makerIDsInFilter: string[] = givenFacetSpec.makerFacetSpec.split(",");
        for (i = 0; i < returnedFacets.makerCategories.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.makerCategories[i].value;
            oneFacet.count = returnedFacets.makerCategories[i].count;
            oneFacet.value = this.historyMakerService.getMaker(oneFacet.ID); // value is the readable string
            if (makerIDsInFilter.indexOf(oneFacet.ID.toString()) !== -1)
                oneFacet.active = true;
            this.facetFamilies[StoryFilterFamilyType.Category].facets.push(oneFacet);
        }
        // Handle job type:
        var jobIDsInFilter: string[] = givenFacetSpec.jobFacetSpec.split(",");
        for (i = 0; i < returnedFacets.occupationTypes.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.occupationTypes[i].value;
            oneFacet.count = returnedFacets.occupationTypes[i].count;
            oneFacet.value = this.historyMakerService.getJobType(oneFacet.ID); // value is the readable string
            if (jobIDsInFilter.indexOf(oneFacet.ID.toString()) !== -1)
                oneFacet.active = true;
            this.facetFamilies[StoryFilterFamilyType.JobType].facets.push(oneFacet);
        }
        // Handle birth decade:
        var birthDecadesInFilter: string[] = givenFacetSpec.birthDecadeFacetSpec.split(",");
        for (i = 0; i < returnedFacets.birthYear.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.birthYear[i].value.toString();
            oneFacet.count = returnedFacets.birthYear[i].count;
            oneFacet.value = "Born in " + returnedFacets.birthYear[i].value + "s"; // value is "Born in " and then the year value with "s" at end to convey a decade, e.g., Born in 1950s for 1950 value
            if (birthDecadesInFilter.indexOf(oneFacet.ID.toString()) !== -1)
                oneFacet.active = true;
            this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].facets.push(oneFacet);
        }
        // Handle region (U.S. state), and also use this information to initialize this.USStateDistribution.count values across the regions (50 states plus DC)
        var regionCount: number[] = [];
        for (i = 0; i <= 51; i++)
            regionCount.push(0); // slot 0 is "unknown", then 51 for 50 states plus DC
        var regionUSStateIDsInFilter: string[] = givenFacetSpec.regionUSStateFacetSpec.split(",");
        var numericIndexForMap: number;
        for (i = 0; i < returnedFacets.entityStates.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.count = returnedFacets.entityStates[i].count;
            oneFacet.ID = returnedFacets.entityStates[i].value; // two-letter code e.g., NY or PA or DC
            oneFacet.value = this.globalState.NameForUSState(oneFacet.ID); // use Pennsylvania instead of PA
            numericIndexForMap = this.globalState.MapIndexForUSState(oneFacet.ID);
            regionCount[numericIndexForMap] = oneFacet.count;

            if (regionUSStateIDsInFilter.indexOf(oneFacet.ID) !== -1)
                oneFacet.active = true;
            if (this.facetFamilies[StoryFilterFamilyType.StateInStory].facets.length < this.MAX_REGION_US_STATES_TO_SHOW_IN_FILTER_AREA)
                this.facetFamilies[StoryFilterFamilyType.StateInStory].facets.push(oneFacet);
        }
        this.USStateDistribution.keyEntitySetCount = totalCount;
        this.USStateDistribution.count = regionCount;
        this.USStateDistribution.regionIDsAlreadyInFilter = givenFacetSpec.regionUSStateFacetSpec.trim();

        // Handle organization, but only keep as a facet if at least 2+ stories name the organization.  This assumes
        // returnedFacets.entityOrganizations sorted by descending count values.
        const MINIMUM_STORY_COUNT_FOR_ORGANIZATION_KEEPER:number = 2;
        var orgsInFilter: string[] = givenFacetSpec.organizationFacetSpec.split(",");
        for (i = 0; i < returnedFacets.entityOrganizations.length && returnedFacets.entityOrganizations[i].count >= MINIMUM_STORY_COUNT_FOR_ORGANIZATION_KEEPER; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.entityOrganizations[i].value;
            oneFacet.count = returnedFacets.entityOrganizations[i].count;
            oneFacet.value = this.historyMakerService.getOrganizationName(oneFacet.ID); // value is the readable string
            if (orgsInFilter.indexOf(oneFacet.ID) !== -1)
                oneFacet.active = true;
            this.facetFamilies[StoryFilterFamilyType.Organization].facets.push(oneFacet);
        }
        // Handle namedDecade (a decade reference/name in the story):
        var namedDecadesInFilter: string[] = givenFacetSpec.namedDecadeFacetSpec.split(",");
        for (i = 0; i < returnedFacets.entityDecades.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.entityDecades[i].value.toString(); // ID is the decade as is, e.g., 1950, so make an ID "1950"
            oneFacet.count = returnedFacets.entityDecades[i].count;
            oneFacet.value = returnedFacets.entityDecades[i].value + "s"; // value is the year value with "s" at end to convey a decade, e.g., 1950s for 1950 value
            if (namedDecadesInFilter.indexOf(oneFacet.ID.toString()) !== -1)
                oneFacet.active = true;
            this.facetFamilies[StoryFilterFamilyType.DecadeInStory].facets.push(oneFacet);
        }
        // Handle namedYear (a year reference/name in the story):
        var namedYearsInFilter: string[] = givenFacetSpec.namedYearFacetSpec.split(",");
        for (i = 0; i < returnedFacets.entityYears.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.entityYears[i].value.toString(); // ID is the year as is, e.g., 1961
            oneFacet.count = returnedFacets.entityYears[i].count;
            oneFacet.value = returnedFacets.entityYears[i].value.toString(); // value is the year as is, e.g., "1961" for 1961
            if (namedYearsInFilter.indexOf(oneFacet.ID.toString()) !== -1)
                oneFacet.active = true;
            this.facetFamilies[StoryFilterFamilyType.YearInStory].facets.push(oneFacet);
        }

        if (this.nonEmptyFacetSpecification(givenFacetSpec))
            this.updateActiveFacetsToMatchFilter(givenFacetSpec.genderFacetSpec, givenFacetSpec.makerFacetSpec, givenFacetSpec.jobFacetSpec,
              givenFacetSpec.birthDecadeFacetSpec, givenFacetSpec.regionUSStateFacetSpec, givenFacetSpec.organizationFacetSpec,
              givenFacetSpec.namedDecadeFacetSpec, givenFacetSpec.namedYearFacetSpec);
    }

    private getTagSearchResultsPage(givenPage: number, givenPageSize: number) {
        var tagIDsToSearch: string = this.myCurrentQuery;
        var titleLabelStoryModifier: string = "";
        this.totalStoriesFound = 0; // service call fills this in after results fetched

        var searchableFacetSpec: SearchableFacetSpecifier = this.computeFacetArguments(this.myCurrentFilterSpec);
        var addFilterPrefixToMapKey:boolean = this.nonEmptyFacetSpecification(searchableFacetSpec);
        if (addFilterPrefixToMapKey)
            titleLabelStoryModifier = "filtered ";
        titleLabelStoryModifier += "tagged";

        this.titleForStorySet = "Searching... (in progress)";
        this.screenReaderSummaryTitle = "HistoryMaker Story Set, Search Pending";

        var sortField:string = ""; // empty string will result in no sort field being used
        var sortInDescendingOrder: boolean = false; // actually will be ignored with an empty sortField

        if (this.globalState.StorySearchSortingPreference >= 0 && this.globalState.StorySearchSortingPreference < this.storySearchSortFields.length) {
            sortField = this.storySearchSortFields[this.globalState.StorySearchSortingPreference].sortField;
            sortInDescendingOrder = this.storySearchSortFields[this.globalState.StorySearchSortingPreference].sortInDescendingOrder;
        }

        this.selectedStoryID = this.globalState.NOTHING_CHOSEN; // assume we have no stories so no selected stories

        this.tagService.getTags().pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(loadedTagTree => { // need to have tag tree loaded in order to be sure tag IDs/tag names are loaded
                if (tagIDsToSearch.length > 0) {

                  this.tagService.getTagSearch(tagIDsToSearch, givenPage, givenPageSize,
                        searchableFacetSpec.genderFacetSpec, searchableFacetSpec.birthDecadeFacetSpec, searchableFacetSpec.makerFacetSpec,
                        searchableFacetSpec.jobFacetSpec, searchableFacetSpec.regionUSStateFacetSpec, searchableFacetSpec.organizationFacetSpec,
                        searchableFacetSpec.namedDecadeFacetSpec, searchableFacetSpec.namedYearFacetSpec, sortField, sortInDescendingOrder)
                        .pipe(takeUntil(this.ngUnsubscribe)).subscribe(retSet => {
                            this.globalState.matchSetContext = retSet; // others may check for scoring terms, match character offsets to scoring terms, etc.
                            this.myStoryList = retSet.stories;
                            if (this.myStoryList != null) {
                                this.totalStoriesFound = retSet.count;
                            }
                            else {
                                this.totalStoriesFound = 0;
                            }
                            this.initializeUSStateCounts(addFilterPrefixToMapKey);

                            this.isSortableSet = true; // allow sort interface on the tag-search result set
                            this.calcTitleAndEnablePaging(givenPage, givenPageSize, titleLabelStoryModifier, " with tags: " + this.tagService.getTagNames(tagIDsToSearch));

                            this.processFacetsFromService(this.totalStoriesFound, retSet.facets, searchableFacetSpec);
                            // Finally, focus can be set because we have our context and content.
                            this.setFocusAsNeeded();
                        },
                        error => {
                            // TODO: Decide if further error logging/analytics is desired on fail-to-load cases like this
                            this.setInterfaceForEmptyStorySet(givenPageSize, "");
                        });

                }
                else {
                    this.myCurrentQuery = null;
                    this.setInterfaceForEmptyStorySet(givenPageSize, "No stories found (unknown tag IDs).");
                }
            },
            error => {
                // TODO: Decide if further error logging/analytics is desired on fail-to-load cases like this
                this.setInterfaceForEmptyStorySet(givenPageSize, "");
            });
    }

    // Set interface for empty results.  If no improvedTitle is given, use "No stories found." as the title.
    private setInterfaceForEmptyStorySet(givenPageSize: number, improvedTitle: string) {
        this.myStoryList = [];
        this.initializeUSStateCounts(false);
        this.processFacetsFromService(0, null, null);

        if (!this.showingStarredSet) {
            if (improvedTitle == null || improvedTitle.length == 0)
                this.titleForStorySet = "No stories found.";
            else
                this.titleForStorySet = improvedTitle;
            this.screenReaderSummaryTitle = "Empty story set";
        }
        // NOTE: At request of our accessibility expert, a descriptive browser title is preferred over a shorter name without paging details,
        // such as "HistoryMaker Story Set", so use the detailed title with suffix indicating "HistoryMaker Story Set".
        this.titleManagerService.setTitle(this.titleForStorySet + " | HistoryMaker Story Set");
        this.liveAnnouncer.announce(this.titleForStorySet); // NOTE: using LiveAnnouncer rather than aria-live tag on a heading element

        this.needToggleDetails = false;

        this.myCurrentPage = 1;
        this.myCurrentPageSize = givenPageSize;
        this.myModelledPageSize = givenPageSize;
        this.SetPagingInterface(false, false);
        // Finally, focus can be set because we have our context and content.
        this.setFocusAsNeeded();
    }

    private initTitleForPage() {
        // Helper function to assign to this.titleForStorySet and this.screenReaderSummaryTitle when paging info is to be reported,
        // i.e., it is assumed that either cardView or textView is true so that paging matters.
        // Two approaches for title: if cardView or textView, we look at a page of results only, so put page info in title.
        // But, for map, look at ALL the results, so do not put page info in title.

        // Also, via accessibility review, simplify if this is My Clips (this.showingStarredSet).
        if (!this.cardView && !this.textView) {
            if (this.showingStarredSet) {
                this.titleForStorySet = "Map view of My Clips";
                this.screenReaderSummaryTitle = "Map view of My Clips";
            }
            else if (this.totalStoriesFound > 0) {
                this.titleForStorySet = "Map view of " + this.totalStoriesFound + " " + this.fullResultSetTitleSuffix;
                this.screenReaderSummaryTitle = "Map view of " + this.fullResultSetTitleSuffix;
            }
            else {
                this.titleForStorySet = "Map view featuring 0 stories";
                this.screenReaderSummaryTitle = "Map view of 0 stories";
            }
        }
        else {
            var countReturned: number;
            var totalPages: number = Math.ceil(this.totalStoriesFound / this.myCurrentPageSize);

            if (this.myStoryList != null && this.myStoryList.length > 0)
                countReturned = this.myStoryList.length;
            else
                countReturned = 0;

            if (countReturned == 0) {
                if (this.myCurrentPage != 1) {
                    if (this.showingStarredSet)
                        this.titleForStorySet = "Nothing in My Clips for page " + this.myCurrentPage + " (" + this.myCurrentPageSize + " per page)";
                    else
                        this.titleForStorySet = "No stories for page " + this.myCurrentPage + " (" + this.myCurrentPageSize + " per page)";
                }
                else {
                    if (this.showingStarredSet)
                        this.titleForStorySet = "My Clips";
                    else
                        this.titleForStorySet = "No results for " + this.fullResultSetTitleSuffix;
                }
                if (this.showingStarredSet)
                    this.screenReaderSummaryTitle = "My Clips";
                else
                    this.screenReaderSummaryTitle = "Empty HistoryMaker Story Set";
            }
            else {
                if (this.totalStoriesFound > this.myCurrentPage * this.myCurrentPageSize) {
                    if (this.showingStarredSet)
                        this.titleForStorySet = "My Clips, page " + this.myCurrentPage + " of " + totalPages;
                    else
                        this.titleForStorySet = this.totalStoriesFound + " " + this.fullResultSetTitleSuffix + ", page " + this.myCurrentPage + " of " + totalPages;
                } else {
                    // Perhaps everything fits on first page (count <= page size).  If so, don't tack on ", page 1 of 1"
                    if (this.myCurrentPage == 1) {
                        if (this.showingStarredSet)
                            this.titleForStorySet = "My Clips";
                        else
                            this.titleForStorySet = this.totalStoriesFound + " " + this.fullResultSetTitleSuffix;
                    }
                    else { // everything does NOT fit on last page of results, but it is true that there is no next page.  Show ", page X of Y"
                        if (this.showingStarredSet)
                            this.titleForStorySet = "My Clips, page " + this.myCurrentPage + " of " + totalPages;
                        else
                            this.titleForStorySet = this.totalStoriesFound + " " + this.fullResultSetTitleSuffix + ", page " + this.myCurrentPage + " of " + totalPages;
                    }
                }
                if (this.showingStarredSet)
                    this.screenReaderSummaryTitle = "My Clips";
                else
                    this.screenReaderSummaryTitle = "HistoryMaker Story Set";
            }
        }

        // NOTE: At request of our accessibility expert, a descriptive browser title is preferred over a shorter name without paging details,
        // such as "HistoryMaker Story Set", so use the detailed title with suffix indicating "HistoryMaker Story Set"
        // (despite some users wanting a short simple title).
        this.titleManagerService.setTitle(this.titleForStorySet + " | HistoryMaker Story Set");
        this.liveAnnouncer.announce(this.titleForStorySet); // NOTE: using LiveAnnouncer rather than aria-live tag on a heading element
    }

    // Set the page title based on given parameters.
    // Also cache the page information in myCurrentPage and myCurrentPageSize.
    // Assumes this.totalStoriesFound set by caller.
    private calcTitleAndEnablePaging(givenPage: number, givenPageSize: number,
          extraAdjectiveForStories: string, suffixForTitleEnd: string) {
        this.myCurrentPage = givenPage;
        this.myCurrentPageSize = givenPageSize;
        this.myModelledPageSize = givenPageSize;
        var modifierForStories: string;
        var totalPages: number = Math.ceil(this.totalStoriesFound / givenPageSize);

        if (this.totalStoriesFound <= 0) {
            this.pages = [];
            this.lastPageInSet = 0;
        }
        else { // Provide numbers for pagination
            this.lastPageInSet = totalPages;
            if (totalPages <= 10 || givenPage <= 6){
                this.pages = [];
                for(let i = 1; i < 10; i++) {
                    if (i <= totalPages) {
                        this.pages.push(i);
                    }
                }
            }
            else {
                // paginate 1 backward
                if(givenPage <= this.pages[5] && this.pages[0] !== 1) {
                    this.pages = this.pages.map( function(value) {
                        return value - 1;
                    } );
                }
                // paginate 1 forward
                else if(givenPage >= this.pages[6] && this.pages.indexOf(totalPages) == -1) {
                    this.pages = this.pages.map( function(value) {
                        return value + 1;
                    } );
                }
                else {
                    this.pages = [];
                    if(givenPage + 8 >= totalPages) {
                        for(let i = totalPages; i > totalPages - 8; i--) {
                            this.pages.unshift(i);
                        }
                        // Removes values of 0 or below from pages array
                        this.pages = this.pages.filter(function(x){ return x > 0 });
                    }
                    else {
                        for(let i = givenPage; i < givenPage + 8; i++) {
                            if (i !== totalPages) {
                                this.pages.push(i);
                            }
                        }
                    }
                }
            }
        }

        if (extraAdjectiveForStories == null || extraAdjectiveForStories.length == 0)
            modifierForStories = "";
        else
            modifierForStories = extraAdjectiveForStories + " "; // add space separator at end

        // NOTE: Depending on this.myType, this.totalStoriesFoundSuffix will be of the form "X Stories" or "X Stories Found" with X a count and modifier perhaps.
        // NOTE: For a TextSearch with wildcard query of match everything, i.e., query is "*", do NOT tack on the "Found" because everything is returned by definition of match-all.
        var storiesTotalSuffix: string = ""; // default (as when an ID list is given) to no extra suffix, i.e., just X Stories
        if ((this.myType == StorySetType.TextSearch && this.myCurrentQuery != "*") || this.myType == StorySetType.TagSearch || this.myType == StorySetType.BiographyCollection)
            storiesTotalSuffix = " Found";

        // Perhaps the given suffix suffixForTitleEnd is empty.  If not, though, prepend a space to it, unless it starts with ", "
        // as do some already-formatted title suffixes.
        var suffixForTitleEndToUse:string = "";
        var temp:string = suffixForTitleEnd.trim();
        if (temp.length > 0) {
            if (temp.startsWith(", "))
                suffixForTitleEndToUse = temp; // do not prepend space before a ", ..." suffix
            else
                suffixForTitleEndToUse = " " + temp; // do prepend a space for all other cases
        }

        // NOTE: fullResultSetTitleSuffix needed when we switch from cardView or textView to the map view of all results instead of a page of results
        if (this.totalStoriesFound == 1)
            this.fullResultSetTitleSuffix = modifierForStories + "story" + suffixForTitleEndToUse;
        else
            this.fullResultSetTitleSuffix = modifierForStories + "stories" + suffixForTitleEndToUse;

        this.initTitleForPage();

        // Set paging based on page size, total count, current page.
        if (this.totalStoriesFound > 0) {
            this.SetPagingInterface((givenPage > 1), (this.totalStoriesFound > givenPage * givenPageSize));
        }
        else { // No stories, perhaps because caller asked for page 1000 of result set that only has 20 pages....
            this.SetPagingInterface((givenPage != 1), false);
        }
        if (this.totalStoriesFound == 1)
            this.totalStoriesFoundSuffix = "1 Story" + storiesTotalSuffix;
        else
            this.totalStoriesFoundSuffix = this.totalStoriesFound.toLocaleString() + " Stories" + storiesTotalSuffix;
    }

    private updateActiveFacetsToMatchFilter(genderFacetSpec: string, makerFacetSpec: string, jobFacetSpec: string,
      birthDecadeFacetSpec: string, regionUSStateFacetSpec: string, organizationFacetSpec: string, namedDecadeFacetSpec: string, namedYearFacetSpec: string) {
        // Update activeFacets to match the specification from the input parameters to this function.
        // Order is as we want it in renderer for listing UI for these active entries:
        // Category; Gender; U.S. State; Organization; Decade; Year; Job; Decade of Birth
        // Since items are put into activeFacets in this order in this call, there is no need
        // to use the helper function insertIntoProperPlaceNewActiveFacetItem from within updateActiveFacetsToMatchFilter.
        this.activeFacets = [];

        var oneFacet: StoryFacetWithFamily;
        var i: number;
        var itemInCSVList: string[];
        var j: number;
        var valueToUse: string;
        var IDToCheck: string;

        // First: Category
        if (makerFacetSpec != null) {
            itemInCSVList = makerFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[StoryFilterFamilyType.Category].facets.length; j++) {
                    if (this.facetFamilies[StoryFilterFamilyType.Category].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[StoryFilterFamilyType.Category].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new StoryFacetWithFamily();
                    oneFacet.setID = StoryFilterFamilyType.Category;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }
        // Second: Gender.  NOTE: Be picky: allow only a single gender facet specification:
        if (genderFacetSpec != null && genderFacetSpec.length == 1) {
            if (genderFacetSpec == "M") {
                oneFacet = new StoryFacetWithFamily();
                oneFacet.setID = StoryFilterFamilyType.Gender;
                oneFacet.ID = this.globalState.MALE_ID;
                oneFacet.value = this.globalState.MALE_MARKER;
                this.activeFacets.push(oneFacet);
            }
            else if (genderFacetSpec == "F") {
                oneFacet = new StoryFacetWithFamily();
                oneFacet.setID = StoryFilterFamilyType.Gender;
                oneFacet.ID = this.globalState.FEMALE_ID;
                oneFacet.value = this.globalState.FEMALE_MARKER;
                this.activeFacets.push(oneFacet);
            }
        }
        // Third, U.S. State
        if (regionUSStateFacetSpec != null) {
            itemInCSVList = regionUSStateFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[StoryFilterFamilyType.StateInStory].facets.length; j++) {
                    if (this.facetFamilies[StoryFilterFamilyType.StateInStory].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[StoryFilterFamilyType.StateInStory].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new StoryFacetWithFamily();
                    oneFacet.setID = StoryFilterFamilyType.StateInStory;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }
        // Fourth: Organization
        if (organizationFacetSpec != null) {
            itemInCSVList = organizationFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[StoryFilterFamilyType.Organization].facets.length; j++) {
                    if (this.facetFamilies[StoryFilterFamilyType.Organization].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[StoryFilterFamilyType.Organization].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new StoryFacetWithFamily();
                    oneFacet.setID = StoryFilterFamilyType.Organization;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }
        // Fifth: decade in story
        if (namedDecadeFacetSpec != null) {
            itemInCSVList = namedDecadeFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[StoryFilterFamilyType.DecadeInStory].facets.length; j++) {
                    if (this.facetFamilies[StoryFilterFamilyType.DecadeInStory].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[StoryFilterFamilyType.DecadeInStory].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new StoryFacetWithFamily();
                    oneFacet.setID = StoryFilterFamilyType.DecadeInStory;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }
        // Sixth: year in story
        if (namedYearFacetSpec != null) {
            itemInCSVList = namedYearFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[StoryFilterFamilyType.YearInStory].facets.length; j++) {
                    if (this.facetFamilies[StoryFilterFamilyType.YearInStory].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[StoryFilterFamilyType.YearInStory].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new StoryFacetWithFamily();
                    oneFacet.setID = StoryFilterFamilyType.YearInStory;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }
        // Seventh: job in story
        if (jobFacetSpec != null) {
            itemInCSVList = jobFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[StoryFilterFamilyType.JobType].facets.length; j++) {
                    if (this.facetFamilies[StoryFilterFamilyType.JobType].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[StoryFilterFamilyType.JobType].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new StoryFacetWithFamily();
                    oneFacet.setID = StoryFilterFamilyType.JobType;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }
        // Eighth: decade of birth
        if (birthDecadeFacetSpec != null) {
            itemInCSVList = birthDecadeFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].facets.length; j++) {
                    if (this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[StoryFilterFamilyType.DecadeOfBirth].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new StoryFacetWithFamily();
                    oneFacet.setID = StoryFilterFamilyType.DecadeOfBirth;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }
    }

    private insertIntoProperPlaceNewActiveFacetItem(givenNewFacet: StoryFacetWithFamily) {
        // Update activeFacets such that all categories are together, then all gender,
        // then all birth decade, etc., rather than last added always goes to end of list.
        // Order is as we want it in renderer for listing UI for these active entries:
        // Category; Gender; U.S. State; Organization; Decade; Year; Job; Decade of Birth

        // Logic: Look for where item should go.  If there are none of the item's set there yet, put it in as first.
        // If there are some of the set, put it to the end of the set.
        var insertionPoint: number = 0;
        var indexSoFar: number = 0;
        // Walk to the end of any Category entries
        while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.Category)
            indexSoFar++;
        if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != StoryFilterFamilyType.Category) {
            // Keep moving in the list, now past any Gender already listed.
            while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.Gender)
                indexSoFar++;

            if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != StoryFilterFamilyType.Gender) {
                // Keep moving in the list, now past any U.S. State already listed.
                while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.StateInStory)
                    indexSoFar++;

                if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != StoryFilterFamilyType.StateInStory) {
                    // Keep moving in the list, now past any Organization already listed.
                    while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.Organization)
                        indexSoFar++;

                    if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != StoryFilterFamilyType.Organization) {
                        // Keep moving in the list, now past any Decade in Story already listed.
                        while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.DecadeInStory)
                            indexSoFar++;

                        if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != StoryFilterFamilyType.DecadeInStory) {
                            // Keep moving in the list, now past any Year in Story already listed.
                            while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.YearInStory)
                                indexSoFar++;

                            if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != StoryFilterFamilyType.YearInStory) {
                                // Keep moving in the list, now past any Job already listed.
                                while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.JobType)
                                    indexSoFar++;

                                if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != StoryFilterFamilyType.JobType) {
                                    // Keep moving in the list, now past any decade of birth listed.  As this is always the last type listed
                                    // based on comment above, simply move now to the end of the list.
                                    indexSoFar = this.activeFacets.length;
                                    // FYI, this is the same as doing:
                                    // while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == StoryFilterFamilyType.DecadeOfBirth)
                                    //    indexSoFar++;
                                }
                            }
                        }
                    }
                }
            }
        }
        this.activeFacets.splice(insertionPoint, 0, givenNewFacet); // put newly added facet in where it belongs
    }

    private SetPagingInterface(goBackPageOK: boolean, goFwdPageOK: boolean) {
        this.needPrevPage = goBackPageOK;
        this.needNextPage = goFwdPageOK;
    }

    private navigationParametersForContext(isFilterForcedUpdate: boolean, pageToLoad: number, pageSize: number): any[] {
        var moreParams = [];


        // NOTE: filter-forced-update, ffu, is a new parameter added to force a contents refresh because the filter changed contents or
        // became empty and so regardless of any other changes, a contents refresh is demanded (by setting the ffu parameter).
        if (isFilterForcedUpdate)
        moreParams['ffu'] = "1";

        // Take care of some other typical arguments like page, page size, etc.
        moreParams['pg'] = pageToLoad;
        moreParams['pgS'] = pageSize;
        var filterSpecInPlay: string = this.specStringFromActiveFacets();
        if (filterSpecInPlay.length > 0) {
          moreParams['spec'] = filterSpecInPlay;

            // NOTE:  if we are forcing the update, given that we are DOING and not CLEARING filter(s), then also update tracking,
            // flagged by setting a 'ut' parameter to 1.
            if (isFilterForcedUpdate)
                moreParams['ut'] = "1";
        }

        if (this.showingFilterMenu)
            moreParams['menu'] = "1";

        if (this.textView)
            moreParams['tv'] = "1";
        else if (!this.cardView)
            moreParams['mv'] = "1"; // NOTE: !textView && !cardView means it is map view, i.e., 'mv'

        // Based on this.myType and other context variables, set parameters used for routing/navigation.
        if (this.myType != null) {

            // !!!TBD!!! TODO: revisit this code and similar routing "wiring up" in story.component.ts and elsewhere, to reduce details known across all component pages.
            if (this.myType == StorySetType.TextSearch) {
                if (this.myCurrentQuery != null) {
                    moreParams['q'] = this.globalState.cleanedQueryRouterParameter(this.myCurrentQuery);
                    if (this.myCurrentSearchTitleOnlyFlag)
                        moreParams['sT'] = "1";
                    else
                        moreParams['sT'] = "0";
                    if (this.myCurrentSearchTranscriptOnlyFlag)
                        moreParams['sS'] = "1";
                    else
                        moreParams['sS'] = "0";
                    if (this.myCurrentSearchParentBiographyID != this.globalState.NOTHING_CHOSEN &&
                      this.myCurrentSearchParentAccession != this.globalState.NO_ACCESSION_CHOSEN) {
                        moreParams['ip'] = this.myCurrentSearchParentBiographyID;
                        moreParams['ia'] = this.myCurrentSearchParentAccession;
                    }
                    if (this.myCurrentInterviewYearRangeFilter != null && this.myCurrentInterviewYearRangeFilter.length > 0)
                        moreParams['iy'] = this.myCurrentInterviewYearRangeFilter;
                }
            }
            else if (this.myType == StorySetType.TagSearch) {
                if (this.myCurrentQuery != null) {
                    moreParams['q'] = this.globalState.cleanedQueryRouterParameter(this.myCurrentQuery);
                }
            }
            else if (this.myType == StorySetType.Mixtape) {
                if (this.givenIDList.length > 0)
                    moreParams['IDList'] = this.givenIDList;
                if (this.mixtapeSetID > 0)
                    moreParams['mixSetID'] = this.mixtapeSetID; // ID for the actual mixtape
            }
            else if (this.myType == StorySetType.GivenIDSet) {
                if (this.givenIDList.length > 0)
                    moreParams['IDList'] = this.givenIDList;
            }
            // NOTE: for this.myType == StorySetType.StarredSet, make use of playlist-manager.service to restore the starred set.

            if (this.myCurrentStorySearchSorting)
                moreParams['so'] = this.myCurrentStorySearchSorting;
        }
        return moreParams;
    }

    private setStorySearchSortFieldOptions() {
        var listOfSortFields = [];
        listOfSortFields.push(new StorySearchSortField(0, "Relevance", "", false));
        listOfSortFields.push(new StorySearchSortField(1, "Oldest Interview", "interviewDate", false));
        listOfSortFields.push(new StorySearchSortField(2, "Latest Interview", "interviewDate", true));
        this.storySearchSortFields = listOfSortFields;
    }

    updateStorySearchSorting(newSortingPreference: number): boolean {
        var isLegalChangeInSortSelection: boolean = false;
        // Returns true iff new sorting preference is legal and different from what is currently used.
        if (newSortingPreference >= 0 && newSortingPreference < this.storySearchSortFields.length) {
            // Legal value.  Check if different.
            if (newSortingPreference != this.globalState.StorySearchSortingPreference) {
                isLegalChangeInSortSelection = true;
                this.globalState.StorySearchSortingPreference = newSortingPreference;
            }
        }
        return isLegalChangeInSortSelection;
    }

    setStorySearchSortingAndDoTheSort() {
        // NOTE: this call is tied to the model of this.myCurrentStorySearchSorting changing.
        // So, pass myCurrentStorySearchSorting to updateBioSearchSorting:
        if (this.updateStorySearchSorting(this.myCurrentStorySearchSorting)) // only re-route if sorting setting changes
            this.routeToPage(1, true); // go to first page of "new" page of results and force update (since this.globalState.StorySearchSortingPreference
                                              // changed via updateBioSearchSorting right before routeToPage)
    }

    setStoryPageSize() {
        // NOTE: we are using this.myModelledPageSize as model for value being passed in here, with this function
        // called whenever a newly posted (perhaps repeated) value is given for this.myModelledPageSize.
        var needContentsRefresh:boolean = false;
        var newVal:number = this.myModelledPageSize;
        if (newVal > 0) { // only consider positive values
            this.globalState.StoryPageSize = newVal;
            if (this.myCurrentPageSize != newVal) {
                if (this.myCurrentPageSize < newVal )
                    // If we are to show MORE content, see if we have more to show.
                    needContentsRefresh = (this.totalStoriesFound > this.myCurrentPageSize);
                else
                    // If we are to show LESS content, see if we have some that will be cropped.
                    needContentsRefresh = (this.totalStoriesFound >= newVal);
                this.myCurrentPageSize = newVal;
                if (needContentsRefresh)
                    this.routeToPage(1, true); // go to first page of "new" page that changes amount of shown content
            }
        }
    }

    goBackPage() {
        if (this.needPrevPage) {
            // Accessibility special case: if we go back via go-back button from page 2 to page 1, there will be no
            // go-back button shown on page one.  Set the focus instead to the page 1 button in this special case.
            if (this.myCurrentPage == 2)
                this.pending_focusOnPageOneButton = true;
            this.routeToPage(this.myCurrentPage - 1, false);
        }
    }

    goFwdPage() {
        if (this.needNextPage) {
            // Accessibility special case: if we go forward via go-fwd button from page N-1 to page N penultimate page, there will be no
            // go-fwd button shown on last page.  Set the focus instead to the page N button in this special case.
            if (this.myCurrentPage + 1 == this.lastPageInSet)
                this.pending_focusOnFinalPageButton = true;
            this.routeToPage(this.myCurrentPage + 1, false);
        }
    }

    goToPage(pageVal) {
        if (pageVal != this.myCurrentPage)
            this.routeToPage(pageVal, false);
    }

    private routeToPage(newPageIdentifier: number, filterPageSortPageSizeEtcForcedUpdate: boolean) {
        if (this.cardView || this.textView) {
            // Only if we are in cardView or textView will page fetching actually take place.
            this.titleForStorySet = "Fetching Page " + newPageIdentifier + "... (in progress)";
            this.screenReaderSummaryTitle = "HistoryMaker Story Set, Page Fetch Pending";
            this.titleManagerService.setTitle(this.screenReaderSummaryTitle);
        }

        // Accumulate routing parameters specifying filter specification, page information, etc.
        this.setOptionsAndRouteToPage(filterPageSortPageSizeEtcForcedUpdate, newPageIdentifier,
          this.myCurrentPageSize, false, -1, StoryFilterFamilyType.None, "", false, false);
    }

    private setOptionsAndRouteToPage(isFilterForcedUpdate: boolean, pageToLoad: number, pageSize: number,
      isClearActionFromRemoveFilterButton: boolean, whichRemoveFilterButtonToFocus: number,
      focusWithinFilterFamily: StoryFilterFamilyType, focusValueWithinFilterFamily: string,
      focusOnCloseOutFilterInterface: boolean, focusOnOpenUpFilterInterface: boolean) {
      // OLD: just storySetTypeIndicator: StorySetType, newPageIdentifier: number, isFilterPageSortSizeEtcForcedUpdate: boolean for routeToPage!!!TBD!!!

        // Set up focus flags so that after routing we set focus to appropriate element.
        this.pending_storyFilterFamily = focusWithinFilterFamily;
        this.pending_storyFilterValue = focusValueWithinFilterFamily;
        this.pending_focusOnCloseFilterButton = focusOnCloseOutFilterInterface;
        this.pending_focusOnOpenFilterButton = focusOnOpenUpFilterInterface;

        if (isClearActionFromRemoveFilterButton) {
            // Focus will be to a remaining remove-filter button in the proper order, or to the first shown filter family.
            if (this.activeFacets.length > 0)
                this.pending_removeFilterButtonIndicator = whichRemoveFilterButtonToFocus; // trust selection given
            else {
                // from accessibility experts: when last remove focus button is exercised, set the focus on the first
                // focus family listed
                this.pending_focusToFirstShownFilterFamily = true;
            }
        }
        else
            this.pending_removeFilterButtonIndicator = -1; // signal not relevant because of !isClearActionFromRemoveFilterButton

        // NOTE: within navigationParametersForContext is where this.specStringFromActiveFacets() is called to set a spec value:
        var moreOptions = this.navigationParametersForContext(isFilterForcedUpdate, pageToLoad, pageSize);

        // Make sure all signals are cleared regarding focus.  Any new focus decisions are made based on pending flags,
        // not signal flags, so simplify bookkeeping and just have all signals cleared before routing.
        this.clearSignalsForCurrentFocusSetting();
        this.router.navigate(['/stories', this.myType, moreOptions]);
    }

    private clearSignalsForCurrentFocusSetting() {
        this.signalFocusToStoryID = this.globalState.NOTHING_CHOSEN;
        this.signalFocusToPageOne = false;
        this.signalFocusToFinalPage = false;
        this.signalFocusToCloseFilterButton = false;
        this.signalFocusToOpenFilterButton = false;
        this.signalFocusToTitle = false;
        this.signalFocusToRemoveFilterButtonIndicator = -1;
        for (var i = 0; i < StoryFilterFamilyTypeCount; i++) {
            this.facetFamilies[i].signalItemToFocus = "";
            this.facetFamilies[i].signalFocusToFamilyParent = false;
        }
    }

    private specStringFromActiveFacets(): string {
        var filterSpec: string;
        var makerFacetSpec: string = "";
        var genderFacetSpec: string = "";
        var regionUSStateSpec: string = "";
        var organizationSpec: string = "";
        var namedDecadeFacetSpec: string = "";
        var namedYearFacetSpec: string = "";
        var jobFacetSpec: string = "";
        var birthDecadeFacetSpec: string = "";

        for (var i = 0; i < this.activeFacets.length; i++) {
            switch (this.activeFacets[i].setID) {
                case StoryFilterFamilyType.Category:
                    makerFacetSpec = makerFacetSpec + this.activeFacets[i].ID + ",";
                    break;
                case StoryFilterFamilyType.Gender:
                    // NOTE: difference in logic here: enforcing ONE gender facet, rather than a list
                    if (this.activeFacets[i].ID == this.globalState.FEMALE_ID)
                        genderFacetSpec = "F";
                    else if (this.activeFacets[i].ID == this.globalState.MALE_ID)
                        genderFacetSpec = "M";
                    break;
                case StoryFilterFamilyType.StateInStory:
                    regionUSStateSpec = regionUSStateSpec + this.activeFacets[i].ID + ",";
                    break;
                case StoryFilterFamilyType.Organization:
                    organizationSpec = organizationSpec + this.activeFacets[i].ID + ",";
                    break;
                case StoryFilterFamilyType.DecadeInStory:
                    namedDecadeFacetSpec = namedDecadeFacetSpec + this.activeFacets[i].ID + ",";
                    break;
                case StoryFilterFamilyType.YearInStory:
                    namedYearFacetSpec = namedYearFacetSpec + this.activeFacets[i].ID + ",";
                    break;
                case StoryFilterFamilyType.JobType:
                    jobFacetSpec = jobFacetSpec + this.activeFacets[i].ID + ",";
                    break;
                case StoryFilterFamilyType.DecadeOfBirth:
                    birthDecadeFacetSpec = birthDecadeFacetSpec + this.activeFacets[i].ID + ",";
                    break;
            }
        }

        // Take off extraneous ending commas for the list specs (aside from genderFacetSpec):
        if (makerFacetSpec.length > 0)
            makerFacetSpec = makerFacetSpec.substring(0, makerFacetSpec.length - 1);
        if (regionUSStateSpec.length > 0)
            regionUSStateSpec = regionUSStateSpec.substring(0, regionUSStateSpec.length - 1);
        if (organizationSpec.length > 0)
            organizationSpec = organizationSpec.substring(0, organizationSpec.length - 1);
        if (namedDecadeFacetSpec.length > 0)
            namedDecadeFacetSpec = namedDecadeFacetSpec.substring(0, namedDecadeFacetSpec.length - 1);
        if (namedYearFacetSpec.length > 0)
            namedYearFacetSpec = namedYearFacetSpec.substring(0, namedYearFacetSpec.length - 1);
        if (jobFacetSpec.length > 0)
            jobFacetSpec = jobFacetSpec.substring(0, jobFacetSpec.length - 1);
        if (birthDecadeFacetSpec.length > 0)
            birthDecadeFacetSpec = birthDecadeFacetSpec.substring(0, birthDecadeFacetSpec.length - 1);

        if (genderFacetSpec == "" && makerFacetSpec == "" && jobFacetSpec == "" && birthDecadeFacetSpec == "" &&
          regionUSStateSpec == "" && organizationSpec == "" && namedDecadeFacetSpec == "" && namedYearFacetSpec == "")
            filterSpec = "";
        else
            filterSpec = genderFacetSpec + "-" + makerFacetSpec + "-" + jobFacetSpec + "-" + birthDecadeFacetSpec + "-" +
              regionUSStateSpec + "-" + organizationSpec + "-" + namedDecadeFacetSpec + "-" + namedYearFacetSpec;
        return filterSpec;
    }

    clearActiveFacetChoice(facetSetOwningTheClear: StoryFilterFamilyType, facetIDToClear: string,
      isClearActionFromRemoveFilterButton: boolean) {
        // NOTE: purpose of isClearActionFromRemoveFilterButton: communicate that after the facet is cleared
        // focus is to return to the remove-buttons list (if isClearActionFromRemoveFilterButton) or to the
        // facet set where a toggle action happened to turn back off a facet (if !isClearActionFromRemoveFilterButton)
        if (facetSetOwningTheClear == StoryFilterFamilyType.None)
            return; // nothing to do for "none"

        var facetCleared: boolean = false;
        var facetValueToClear: string = "";
        var itemClearedOrder: number = 0; // which item was cleared
        for (var i = 0; i < this.activeFacets.length; i++) {
            if (this.activeFacets[i].setID == facetSetOwningTheClear &&
              facetIDToClear == this.activeFacets[i].ID) {
                itemClearedOrder = i; // used to set focus back to i'th (or last) item in remaining activeFacets list
                                      // if and only if isClearActionFromRemoveFilterButton
                facetValueToClear = this.activeFacets[i].value;
                this.activeFacets.splice(i, 1);
                facetCleared = true;
                break;
            }
        }
        if (facetCleared) {
            this.processClearedFilter(isClearActionFromRemoveFilterButton, itemClearedOrder,
              facetSetOwningTheClear, facetValueToClear);
        }
    }

    toggleActiveFacetChoice(facetSetOwningTheToggle: StoryFilterFamilyType, chosenFacet: FacetDetail) {
        // If active, then clear it; if not active, make active.
        var itemAlreadyChosen: boolean = false;
        var chosenFacetID: string = chosenFacet.ID;
        var chosenFacetValue: string = chosenFacet.value;

        for (var i = 0; i < this.activeFacets.length; i++) {
            if (this.activeFacets[i].setID == facetSetOwningTheToggle &&
              this.activeFacets[i].ID == chosenFacetID) {
                itemAlreadyChosen = true;
                chosenFacet.active = false;
                // Note with third parameter isClearActionFromRemoveFilterButton as false
                // that this action is coming from a toggle handler:
                this.clearActiveFacetChoice(facetSetOwningTheToggle, chosenFacetID, false);
                break;
            }
        }
        if (!itemAlreadyChosen) {
            var oneFacet: StoryFacetWithFamily = new StoryFacetWithFamily();
            oneFacet.setID = facetSetOwningTheToggle;
            oneFacet.ID = chosenFacetID;
            oneFacet.value = chosenFacetValue;
            chosenFacet.active = true;
            this.insertIntoProperPlaceNewActiveFacetItem(oneFacet);
            this.processUpdatedFilter(facetSetOwningTheToggle, chosenFacetValue);
        }
    }

    filterOnUSMapRegion(chosenUSMapRegionID: string) {
        // If given region is already picked, do nothing.
        // Else, filter on it.  NOTE: this is DIFFERENT behavior from toggleActiveFacetChoice()
        // where selecting something already selected would clear it.
        var itemAlreadyChosen: boolean = false;
        for (var i = 0; i < this.activeFacets.length; i++) {
            if (this.activeFacets[i].setID == StoryFilterFamilyType.StateInStory &&
              this.activeFacets[i].ID == chosenUSMapRegionID) {
                itemAlreadyChosen = true;
                break;
            }
        }
        if (!itemAlreadyChosen) {
            var oneFacet: StoryFacetWithFamily = new StoryFacetWithFamily();
            oneFacet.setID = StoryFilterFamilyType.StateInStory;
            oneFacet.ID = chosenUSMapRegionID;
            oneFacet.value = this.globalState.NameForUSState(chosenUSMapRegionID); // e.g., get "Hawaii" from "HI"
            this.insertIntoProperPlaceNewActiveFacetItem(oneFacet);
            this.processUpdatedFilter(StoryFilterFamilyType.StateInStory, oneFacet.value);
        }
    }

    clearFilters() {// CLears both data state and updates the UI accordingly.
        this.activeFacets = [];
        this.processUpdatedFilter(StoryFilterFamilyType.None, "");
    }

    appendedCountToValue(givenValue: string, givenCount: number): string {
        return givenValue + ", " + givenCount;
    }

    hasActiveFacet():boolean {
        return this.activeFacets && this.activeFacets.length > 0;
    }

    private processClearedFilter(isClearActionFromRemoveFilterButton: boolean, whichRemoveFilterButtonToFocus: number,
      focusWithinFilterFamily: StoryFilterFamilyType, focusValueWithinFilterFamily: string) {
        if (this.activeFacets.length > 0) {
            this.titleForStorySet = "Fetching Filtered Page 1... (in progress)";
            this.screenReaderSummaryTitle = "HistoryMaker Story Set, Results Pending";
            this.titleManagerService.setTitle(this.screenReaderSummaryTitle);
            // Fold in filter spec, too, which will happen with call to this.specStringFromActiveFacets() within this.setOptionsAndRouteToPage().
        }
        else {
            // Special case: we just removed the last remaining filter, i.e., there are no filters left.
            this.titleForStorySet = "Fetching Page 1... (in progress)";
            this.screenReaderSummaryTitle = "HistoryMaker Story Set, Results Pending";
            this.titleManagerService.setTitle(this.screenReaderSummaryTitle);
        }
        this.setOptionsAndRouteToPage(true, 1, this.myCurrentPageSize,
          isClearActionFromRemoveFilterButton, whichRemoveFilterButtonToFocus,
          focusWithinFilterFamily, focusValueWithinFilterFamily, false, false);
    }

    private processUpdatedFilter(focusWithinFilterFamily: StoryFilterFamilyType, focusValueWithinFilterFamily: string) {
        // Do the filtering by calling the router with an updated spec argument, returning to page 1 of the newly filtered set:
        this.titleForStorySet = "Fetching Filtered Page 1... (in progress)";
        this.screenReaderSummaryTitle = "Fetching Filtered Page 1";
        this.titleManagerService.setTitle("HistoryMaker Story Set, Results Pending");

        // Accumulate routing parameters specifying filter specification, page information, etc.
        this.setOptionsAndRouteToPage(true, 1, this.myCurrentPageSize,
          false, -1, focusWithinFilterFamily, focusValueWithinFilterFamily, false, false);
    }

    openPickFilterMenu() {
        this.showingFilterMenu = true;
        // NOTE:  To allow bookmarking the shown filter setting immediately, must have a call to setOptionsAndRouteToPage here.
        // That call has been improved to not do extra work (besides adding in a routing parameter that showingFilterMenu is true).
        // NOTE: on refresh of the route the button to close out the pick filter menu should get the focus since the
        // button that was focused to get this action will no longer be part of the rendering.
        this.setOptionsAndRouteToPage(false, this.myCurrentPage, this.myCurrentPageSize,
          false, -1, StoryFilterFamilyType.None, "", true, false);
    }

    closePickFilterMenu() {
        this.showingFilterMenu = false;
        // With filter menu closed, the possible route argument of menu=1 no longer holds.
        // Reload the route (which because of !this.showingFilterMenu will not have the menu=1 tacked into the route).
        // NOTE: on refresh of the route the button to open the pick filter menu should get the focus since the
        // button that was focused to get this action will no longer be part of the rendering.
        this.setOptionsAndRouteToPage(false, this.myCurrentPage, this.myCurrentPageSize,
          false, -1, StoryFilterFamilyType.None, "", false, true);
    }

    copyIntoMyClips() {
      // Add in all of this.myStoryList in order into My Clips (of course if there already, don't add again)
      this.playlistManagerService.appendToMyClips(this.myStoryList);
    }
}
