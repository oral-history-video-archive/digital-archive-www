import { Component, OnInit, ViewChild, ViewChildren, ElementRef, QueryList, AfterViewChecked } from '@angular/core';
import { takeUntil } from "rxjs/operators";

import { BriefBio } from './brief-bio';
import { HistoryMakerService } from './historymaker.service';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { TitleManagerService } from '../shared/title-manager.service';
import { SearchFormService } from '../shared/search-form/search-form.service';
import { Facets } from './facets';
import { FacetDetail, FacetFamilyContainer } from './facet-detail';
import { GlobalState } from '../app.global-state';
import { BiographySearchSortField } from './biography-search-sort-field';

import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';

import { SearchFormOptions } from '../shared/search-form/search-form-options';
import { BaseComponent } from '../shared/base.component';
import { USMapDistribution } from '../US-map/US-map-distribution';
import { USMapManagerService } from '../US-map/US-map-manager.service';
import { BioFilterFamilyType, BioFilterFamilyTypeCount, FacetWithFamily } from './biofilterfamily-type';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title, e.g., instead of
// <h2 aria-live="assertive" aria-atomic="true" class="sr-only">{{biographySetTitle}}</h2> ...which sometimes was double-read by screen readers.
// Angular folks recognized this and added in a timer to take care of it in their LiveAnnouncer implementation.

@Component({
    selector: 'my-historymakers',
    templateUrl: './historymakers.component.html',
    styleUrls: ['./historymakers.component.scss']
})

export class HistoryMakersComponent extends BaseComponent implements OnInit, AfterViewChecked {
  @ViewChild('rg1Map') radioGroup1_Map: ElementRef;
  @ViewChild('rg1Text') radioGroup1_Text: ElementRef;
  @ViewChild('rg1Pic') radioGroup1_Pic: ElementRef;
  @ViewChild('rg2Map') radioGroup2_Map: ElementRef;
  @ViewChild('rg2Text') radioGroup2_Text: ElementRef;
  @ViewChild('rg2Pic') radioGroup2_Pic: ElementRef;s
  @ViewChild('rgLastInitialParentInFilterMenu') lastInitialInFilterMenu_Parent: ElementRef;
  @ViewChild('rgLastInitialParent') lastInitial_Parent: ElementRef;
  @ViewChildren('rgLastInitialInFilterMenu') lastInitialItemsInFilterMenu: QueryList<ElementRef>;
  @ViewChildren('rgLastInitial') lastInitialItems: QueryList<ElementRef>;

    readonly MAX_REGION_US_STATES_TO_SHOW_IN_FILTER_AREA:number = 10; // need data from all 50+DC for map view, but don't show all 51, just the top N
    readonly NO_US_BIRTHSTATE_FOR_SOME_LABEL_SUFFIX:string = " born outside the U.S. or with unrecorded birth location."; // of form: prefix # HistoryMaker(s) and this suffix

    biographySetTitle: string; // includes a count
    screenReaderSummaryTitle: string; // abbreviated form (no count, paging, etc., given in this summary)
    totalBiographiesFoundSuffix: string; // used in html rendering of this component
    fullResultSetTitleSuffix: string; // cached information about the full result set used in constructing title
    showingAllHistoryMakers: boolean;
    biographies: BriefBio[];
    totalBiographiesFound: number; // a count that may be more than the "kept" page of bios in biographies

    USStateDistribution: USMapDistribution;

    needPrevPage: boolean = false;
    needNextPage: boolean = false;
    pages: number[] = [];
    lastPageInSet: number = 0;

    public myCurrentPageSize: number;
    public myModelledPageSize: number;

    myCurrentBiographySearchSorting: number; // indicator on the sorting in use
    bioSearchSortFields: BiographySearchSortField[];

    cardView: boolean = true;
    textView: boolean = false; // NOTE: it may be that BOTH cardView and textView are false (e.g., for a U.S. states map view)

    signalFocusMoveToFirstLastInitial: boolean = false;
    signalFocusMoveToFirstLastInitial_FilterMenu: boolean = false;
    signalFocusMoveToMenu_LastInitial: boolean = false;
    signalFocusMoveToFilterMenu_LastInitial: boolean = false;
    signalFocusToBiographyID: string = "";
    signalFocusToRemoveFilterButtonIndicator: number = -1;
    signalFocusToFirstShownFamily: boolean[];
    signalFocusToPageOne: boolean = false;
    signalFocusToFinalPage: boolean = false;
    signalFocusToCloseFilterButton: boolean = false;
    signalFocusToOpenFilterButton: boolean = false;
    signalFocusToTitle: boolean = false;

    // !!!TBD!!! REVISIT how to signal where focus should go after contents are all refreshed.
    private pending_signalFocusMoveToMenu_LastInitial: boolean = false;
    private pending_signalFocusMoveToFilterMenu_LastInitial: boolean = false;
    private pending_bioFilterFamily: BioFilterFamilyType = BioFilterFamilyType.None;
    private pending_bioFilterValue: string = "";
    private pending_removeFilterButtonIndicator: number = -1;
    private pending_focusToFirstShownFilterFamily: boolean = false;
    private pending_focusOnPageOneButton: boolean = false;
    private pending_focusOnFinalPageButton: boolean = false;
    private pending_focusOnCloseFilterButton: boolean = false;
    private pending_focusOnOpenFilterButton: boolean = false;

    // NOTE: REVISIT THIS BECAUSE WE HAVE ASSUMPTIONS HERE ON EXACTLY 6 FACET GROUPS IN PARTICULAR FORMS.  MVC works for facets, but are not coded for extensibility at this point!!!
    // NOTE: facet groups are not the same for biographies and stories: with biographies there is a lastInitial facet.
    // NOTE: could redo these and other sets of 6 variables to instead be keyed by the six non-empty types in BioFilterFamilyType for these  6 groups.
    //
    facetFamilies: FacetFamilyContainer[] = []; // initialized once, in constructor, so there is entry for each of the BioFilterFamilyType values
    lastInitialFacets: FacetDetail[] = [];

    activeFacets: FacetWithFamily[] = [];

    // Record the state of various filter panels (used in html rendering, keeps narrow and wide views consistent)
    private lastNameOpened: boolean = false; // see elsewhere if this is initialized differently based on client request...
    // Remainder are in facetFamilies[].isOpened...

    private myCurrentPage: number;
    private myCurrentQuery: string;
    private myCurrentSearchLastNameOnlyFlag: boolean;
    private myCurrentSearchPreferredNameOnlyFlag: boolean;
    private myBornThisTimeFilterFlag: boolean;

    bioSearchFieldsMask:number;

    showingFilterMenu: boolean = false; // changes the display of the page: filters on side with other items, or just filters in a menu

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public globalState: GlobalState,
        private historyMakerService: HistoryMakerService,
        private titleManagerService: TitleManagerService,
        private userSettingsManagerService: UserSettingsManagerService,
        private liveAnnouncer: LiveAnnouncer,
        private myUSMapManagerService: USMapManagerService,
        private searchFormService: SearchFormService) {

        super(); // since this is a derived class from BaseComponent

        // Set up data structure for facet families.
        this.initializeFacetFamilies();

        // Start off with an empty signal about what to focus on (done after facet families initialized)
        this.clearSignalsForCurrentFocusSetting();

        this.myCurrentPageSize = this.globalState.BiographyPageSize;
        this.myModelledPageSize = this.myCurrentPageSize;
        this.totalBiographiesFound = 0;

        this.biographySetTitle = "The HistoryMakers";
        this.screenReaderSummaryTitle = "Maker Directory";

        this.searchFormService.setSearchOptions(new SearchFormOptions(true, this.globalState.NOTHING_CHOSEN, this.globalState.NO_ACCESSION_CHOSEN, false));

        // Get subscriptions tied in using best practice recommendation for how to unsubscribe, here and
        // below in this component wherever .subscribe is used:

        myUSMapManagerService.clickedRegionID$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.filterOnUSMapRegion(value);
        });

        // NOTE: these pipes assume this.facetFamilies already initialized (via this.initializeFacetFamilies()).
        userSettingsManagerService.showBiographyBirthStateFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[BioFilterFamilyType.BirthState].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showBiographyDecadeOfBirthFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[BioFilterFamilyType.BirthDecade].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showBiographyJobTypeFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[BioFilterFamilyType.JobType].isAllowedToBeShown = value;
        });
        userSettingsManagerService.showBiographyLastNameFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.facetFamilies[BioFilterFamilyType.LastNameInitial].isAllowedToBeShown = value;
        });
        userSettingsManagerService.bioSearchFieldsMask$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.bioSearchFieldsMask = value;
        });
    }

    private initializeFacetFamilies() {
        var oneFamilyContainer: FacetFamilyContainer;
        // Get signalling set up and cleared regarding focus movement.
        for (var i = 0; i < BioFilterFamilyTypeCount; i++) {
            oneFamilyContainer = new FacetFamilyContainer();
            this.facetFamilies.push(oneFamilyContainer);
        }
        // Initialize each family, with "None" not really used, and "LastNameInitial" having a special UI such that its facets list should always be empty
        // so that a traditional UI is not used for it instead.
        this.facetFamilies[BioFilterFamilyType.None].facets = null;
        this.facetFamilies[BioFilterFamilyType.None].isAllowedToBeShown = false; // always false
        this.facetFamilies[BioFilterFamilyType.None].isOpened = false;
        this.facetFamilies[BioFilterFamilyType.None].title = "N/A";
        this.facetFamilies[BioFilterFamilyType.None].nameForLabel = "";
        this.facetFamilies[BioFilterFamilyType.None].signalItemToFocus = "";
        this.facetFamilies[BioFilterFamilyType.None].signalFocusToFamilyParent = false;

        this.facetFamilies[BioFilterFamilyType.LastNameInitial].facets = []; // NOTE: not populated, as this.lastInitialFacets used instead
        this.facetFamilies[BioFilterFamilyType.LastNameInitial].isAllowedToBeShown = false; // changes with userSettingsManagerService.showBiographyLastNameFacetFilter

        // NOTE: By client request in August 2020, start off with LastNameInitial opened.
        // BUT, this broke some accessibility, and is less usable, so it is NOT turned to true.
        // Code below commented out to note that the option was turned on and works, but once again reverts to a default of false (not open).
        /*
        this.facetFamilies[BioFilterFamilyType.LastNameInitial].isOpened = true;
        // NOTE: LastNameInitial facetFamily entry not really used; special cased with this.lastInitialFacets
        // and this.lastNameOpened instead
        this.lastNameOpened = true;
        */

        this.facetFamilies[BioFilterFamilyType.LastNameInitial].title = "Last Name";
        this.facetFamilies[BioFilterFamilyType.LastNameInitial].nameForLabel = "Last Initial";
        this.facetFamilies[BioFilterFamilyType.LastNameInitial].signalItemToFocus = "";
        this.facetFamilies[BioFilterFamilyType.LastNameInitial].signalFocusToFamilyParent = false;

        this.facetFamilies[BioFilterFamilyType.Category].facets = [];
        this.facetFamilies[BioFilterFamilyType.Category].isAllowedToBeShown = true; // always shown
        this.facetFamilies[BioFilterFamilyType.Category].isOpened = false;
        this.facetFamilies[BioFilterFamilyType.Category].title = "Category";
        this.facetFamilies[BioFilterFamilyType.Category].nameForLabel = "Category";
        this.facetFamilies[BioFilterFamilyType.Category].signalItemToFocus = "";
        this.facetFamilies[BioFilterFamilyType.Category].signalFocusToFamilyParent = false;

        this.facetFamilies[BioFilterFamilyType.Gender].facets = [];
        this.facetFamilies[BioFilterFamilyType.Gender].isAllowedToBeShown = true; // always shown
        this.facetFamilies[BioFilterFamilyType.Gender].isOpened = false;
        this.facetFamilies[BioFilterFamilyType.Gender].title = "Gender";
        this.facetFamilies[BioFilterFamilyType.Gender].nameForLabel = "Gender";
        this.facetFamilies[BioFilterFamilyType.Gender].signalItemToFocus = "";
        this.facetFamilies[BioFilterFamilyType.Gender].signalFocusToFamilyParent = false;

        this.facetFamilies[BioFilterFamilyType.BirthDecade].facets = [];
        this.facetFamilies[BioFilterFamilyType.BirthDecade].isAllowedToBeShown = false; // changes with userSettingsManagerService.showBiographyDecadeOfBirthFacetFilter
        this.facetFamilies[BioFilterFamilyType.BirthDecade].isOpened = false;
        this.facetFamilies[BioFilterFamilyType.BirthDecade].title = "Decade of Birth";
        this.facetFamilies[BioFilterFamilyType.BirthDecade].nameForLabel = "Decade of Birth";
        this.facetFamilies[BioFilterFamilyType.BirthDecade].signalItemToFocus = "";
        this.facetFamilies[BioFilterFamilyType.BirthDecade].signalFocusToFamilyParent = false;

        this.facetFamilies[BioFilterFamilyType.BirthState].isOpened = false;
        this.facetFamilies[BioFilterFamilyType.BirthState].isAllowedToBeShown = false; // changes with userSettingsManagerService.showBiographyBirthStateFacetFilter
        this.facetFamilies[BioFilterFamilyType.BirthState].title = "Birth State";
        this.facetFamilies[BioFilterFamilyType.BirthState].nameForLabel = "Birth State";
        this.facetFamilies[BioFilterFamilyType.BirthState].signalItemToFocus = "";
        this.facetFamilies[BioFilterFamilyType.BirthState].signalFocusToFamilyParent = false;

        this.facetFamilies[BioFilterFamilyType.JobType].facets = [];
        this.facetFamilies[BioFilterFamilyType.JobType].isAllowedToBeShown = false; // changes with userSettingsManagerService.showBiographyJobTypeFacetFilter
        this.facetFamilies[BioFilterFamilyType.JobType].isOpened = false;
        this.facetFamilies[BioFilterFamilyType.JobType].title = "Job Type";
        this.facetFamilies[BioFilterFamilyType.JobType].nameForLabel = "Job";
        this.facetFamilies[BioFilterFamilyType.JobType].signalItemToFocus = "";
        this.facetFamilies[BioFilterFamilyType.JobType].signalFocusToFamilyParent = false;
    }

    private setBiographySearchSortFieldOptions() {
        var listOfSortFields = [];
        listOfSortFields.push(new BiographySearchSortField(0, "Relevance", "", false));
        listOfSortFields.push(new BiographySearchSortField(1, "A-Z Last Name", "lastName", false));
        listOfSortFields.push(new BiographySearchSortField(2, "Z-A Last Name", "lastName", true));
        listOfSortFields.push(new BiographySearchSortField(3, "Oldest First", "birthDate", false));
        listOfSortFields.push(new BiographySearchSortField(4, "Youngest First", "birthDate", true));
        // Default to "Relevance" in case value is messed up in global state.
        if (this.globalState.BiographySearchSortingPreference < 0 ||
          this.globalState.BiographySearchSortingPreference >= listOfSortFields.length)
            this.globalState.BiographySearchSortingPreference = 0;
        this.bioSearchSortFields = listOfSortFields;
    }

    ngOnInit() {
        this.facetFamilies[BioFilterFamilyType.LastNameInitial].isAllowedToBeShown = this.userSettingsManagerService.currentShowBiographyLastNameFacetFilter();
        this.facetFamilies[BioFilterFamilyType.BirthState].isAllowedToBeShown = this.userSettingsManagerService.currentShowBiographyBirthStateFacetFilter();
        this.facetFamilies[BioFilterFamilyType.BirthDecade].isAllowedToBeShown = this.userSettingsManagerService.currentShowBiographyDecadeOfBirthFacetFilter();
        this.facetFamilies[BioFilterFamilyType.JobType].isAllowedToBeShown = this.userSettingsManagerService.currentShowBiographyJobTypeFacetFilter();
        this.bioSearchFieldsMask = this.userSettingsManagerService.currentBioSearchFieldsMask();

        this.setBiographySearchSortFieldOptions();
        this.myCurrentBiographySearchSorting = this.globalState.BiographySearchSortingPreference;

        this.route.params.forEach((params: Params) => {
            var isFilterForcedUpdate: boolean = false;

            if (params['ffu'] !== undefined && params['ffu'] == "1")
                isFilterForcedUpdate = true;

            var givenPageSize: number = this.globalState.BiographyPageSize;
            var givenPageIndicator: number = 1;

            if (params['pgS'] !== undefined) {
                var candidatePageSize = +params['pgS'];
                if (candidatePageSize != null && candidatePageSize > 0)
                    givenPageSize = candidatePageSize;
            }
            if (params['pg'] !== undefined) {
                var candidatePageIndicator = +params['pg'];
                if (candidatePageIndicator != null && candidatePageIndicator > 0)
                    givenPageIndicator = candidatePageIndicator; // 1-based indicator used, so first page is at page 1
            }

            // Determine if filter-menu option is on or not
            if (params['menu'] !== undefined && !isNaN(+params['menu']))
                this.showingFilterMenu = (+params['menu'] == 1);
            else
                this.showingFilterMenu = false;

            // NOTE: need to document meaning of parameters as we are getting a parameter explosion with increased capabilities and client requests,
            // e.g., 'ln' signal search just the last name field, 'pn' just preferred name field, so signals search field sorting order,
            // bt signals a filter to those born this time as in day or week, etc.
            // A better design:  routing with less parameters, or a better way to deal with the "pass throughs" that are only there to allow a "back" in-page navigation item.
            // Much simplification is possible if we back away from in-page "go back" options and rely on browser back button to go back to prior "page".

            // Determine current "state" of the page (remember, this code "fires" if only parameters change) to see if there is really a need for lots of work,
            // e.g., for getting a new fetch of HistoryMakers meeting some criteria.  It may be, for example, that the filter menu was opened, adjusted little or
            // nothing, and now closes, and there is not really a need for any fetch of different HistoryMakers because the criteria remained the same.
            // So, do NOT change the this.___ state of things yet (aside from this.showingFilterMenu):
            // first collect the "new" state of things for a comparison...
            var newBornThisTimeFilterFlag: boolean = false;
            var newCurrentQuery: string = null;
            var sortOrderChanged: boolean = false;
            var searchLastNameOnlyFlag: boolean = this.globalState.BiographySearchLastNameOnly;
            var searchPreferredNameOnlyFlag: boolean = this.globalState.BiographySearchPreferredNameOnly;
            var anticipatedMapView: boolean = !this.cardView; // NOTE: doing it this way so that this.cardView = true will be a default state
            var anticipatedTextView: boolean = this.textView;

            var newSpec = "";

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

            // If we have bt, we ignore q, ln, etc., as we do not issue a query, just a filter to those "born this time":
            if (params['bt'] != undefined && params['bt'] == "1") {
                newBornThisTimeFilterFlag = true;
                newCurrentQuery = null;
            }
            else {
                newBornThisTimeFilterFlag = false;
                if (params['q'] !== undefined) {
                    newCurrentQuery = params['q'];
                    if (newCurrentQuery.trim().length == 0)
                        newCurrentQuery = null; // up front throw out an all-whitespace query as a non-query signified by null
                }
                else
                    newCurrentQuery = null;
                if (params['ln'] !== undefined)
                    searchLastNameOnlyFlag = (params['ln'] == "1");
                if (params['pn'] !== undefined)
                    searchPreferredNameOnlyFlag = (params['pn'] == "1");

                if (params['so'] !== undefined  && !isNaN(+params['so'])) {
                    var candidateSortOrder:number = +params['so'];
                    if (candidateSortOrder >= 0 && candidateSortOrder < this.bioSearchSortFields.length) {
                        sortOrderChanged = this.updateBioSearchSorting(candidateSortOrder);
                    }
                }
            }

            if (isFilterForcedUpdate || sortOrderChanged || newBornThisTimeFilterFlag != this.myBornThisTimeFilterFlag || newCurrentQuery != this.myCurrentQuery ||
              this.myCurrentSearchLastNameOnlyFlag != searchLastNameOnlyFlag || this.myCurrentSearchPreferredNameOnlyFlag != searchPreferredNameOnlyFlag ||
              this.myCurrentPage != givenPageIndicator || this.myCurrentPageSize != givenPageSize ||
              this.specStringFromActiveFacets() != newSpec) {
                // A re-fetch of HistoryMakers is needed because context changed in some way.
                // Update context in this... for query and page state and view (with sort order already updated and noted via sortOrderChanged)
                this.myBornThisTimeFilterFlag = newBornThisTimeFilterFlag;
                this.myCurrentQuery = newCurrentQuery;
                this.myCurrentSearchLastNameOnlyFlag = searchLastNameOnlyFlag;
                this.myCurrentSearchPreferredNameOnlyFlag = searchPreferredNameOnlyFlag;

                this.textView = anticipatedTextView;
                if (anticipatedTextView)
                    this.cardView = false;
                else
                    this.cardView = !anticipatedMapView;

                this.getHistoryMakers(givenPageIndicator, givenPageSize, newSpec);
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

    ngAfterViewChecked() {
        // Accessibility concerns on last initial set of buttons: when container for it "opens" then
        // focus to the first item within; when that set is escaped out, set focus to the container menu.
        if (this.signalFocusMoveToFirstLastInitial_FilterMenu) {
            if (this.lastInitialItemsInFilterMenu.length > 0) {
                let lastInitialOptionElements: ElementRef[] = this.lastInitialItemsInFilterMenu.toArray();
                lastInitialOptionElements[0].nativeElement.focus();
                this.signalFocusMoveToFirstLastInitial_FilterMenu = false;
                this.onFocusChangeLastInitialOptions(0, true);
            }
        }
        else if (this.signalFocusMoveToFirstLastInitial) {
            if (this.lastInitialItems.length > 0) {
                let lastInitialOptionElements: ElementRef[] = this.lastInitialItems.toArray();
                lastInitialOptionElements[0].nativeElement.focus();
                this.signalFocusMoveToFirstLastInitial = false;
                this.onFocusChangeLastInitialOptions(0, true);
            }
        }
        /* NOTE: While it may make sense to proceed with the same pattern...
        else if (this.signalFocusMoveToFilterMenu_LastInitial) {
            if (this.lastInitialInFilterMenu_Parent && this.lastInitialInFilterMenu_Parent.nativeElement) {
                this.lastInitialInFilterMenu_Parent.nativeElement.focus();
                this.signalFocusMoveToFilterMenu_LastInitial = false;
            }
        }
        else if (this.signalFocusMoveToMenu_LastInitial) {
            if (this.lastInitial_Parent && this.lastInitial_Parent.nativeElement) {
                this.lastInitial_Parent.nativeElement.focus();
                this.signalFocusMoveToMenu_LastInitial = false;
            }
        }
        ...this will not work because the element lastInitial_Parent is NOT a nativeElement but is an Angular component.
        So, instead, these signals are used in the renderer (html) to signal the component to focus appropriately.
        */
    }

    getHistoryMakers(givenPage: number, givenPageSize: number, filterSpecToUse: string) {
        // NOTE:  assumes range for givenPage is legal: [1, maxPagesNeeded] and that
        //  myCurrentQuery is set appropriately for a query, or cleared for no query

        var titleLabelSuffix: string = "";
        var genderFacetSpec: string = "";
        var makerFacetSpec: string = "";
        var jobFacetSpec: string = "";
        var birthDecadeFacetSpec: string = "";
        var lastInitialFacetSpec: string = "";
        var regionUSStateFacetSpec: string = "";
        var addFilterPrefixToMapKey: boolean;

        if (filterSpecToUse.length > 0) {
            var filterPieces: string[] = filterSpecToUse.split("-");
            if (filterPieces.length == 6) {
                genderFacetSpec = filterPieces[0];
                makerFacetSpec = filterPieces[1];
                jobFacetSpec = filterPieces[2];
                birthDecadeFacetSpec = filterPieces[3];
                lastInitialFacetSpec = filterPieces[4];
                regionUSStateFacetSpec = filterPieces[5];
                if (genderFacetSpec.length > 0 || makerFacetSpec.length > 0 || jobFacetSpec.length > 0 || birthDecadeFacetSpec.length > 0
                    || lastInitialFacetSpec.length > 0 || regionUSStateFacetSpec.length > 0) {
                    titleLabelSuffix = " filtered";
                    addFilterPrefixToMapKey = true;
                }
            }
        }
        titleLabelSuffix += " HistoryMaker";
        this.totalBiographiesFound = 0; // typically is reassigned later with a service subscription

        // Wire up sort field and sort order to interfaces based on this.globalState.BiographySearchSortingPreference and this.bioSearchSortFields.
        // NOTE: these are NOT used with getHistoryMakersBornThisDay (or BornThisWeek) service.
        var sortField:string = ""; // empty string will result in service's default sort field being used
        var sortInDescendingOrder: boolean = false; // actually will be ignored with an empty sortField
        if (this.globalState.BiographySearchSortingPreference >= 0 && this.globalState.BiographySearchSortingPreference < this.bioSearchSortFields.length) {
            sortField = this.bioSearchSortFields[this.globalState.BiographySearchSortingPreference].sortField;
            sortInDescendingOrder = this.bioSearchSortFields[this.globalState.BiographySearchSortingPreference].sortInDescendingOrder;
        }

        if (this.myBornThisTimeFilterFlag) {
            this.historyMakerService.getHistoryMakersBornThisDay(givenPage, givenPageSize, genderFacetSpec,
              birthDecadeFacetSpec, makerFacetSpec, jobFacetSpec, lastInitialFacetSpec, regionUSStateFacetSpec).pipe(takeUntil(this.ngUnsubscribe)).subscribe(retSet => {
                this.myCurrentPage = givenPage;
                this.myCurrentPageSize = givenPageSize;
                this.myModelledPageSize = givenPageSize;
                this.biographies = retSet.biographies;
                this.totalBiographiesFound = retSet.count;
                this.initializeUSStateCounts(addFilterPrefixToMapKey);
                this.initializeTitleAndPaging(givenPage, givenPageSize, retSet.count, titleLabelSuffix);
                this.processFacetsFromService(retSet.count, retSet.facets, genderFacetSpec, makerFacetSpec, jobFacetSpec, birthDecadeFacetSpec, lastInitialFacetSpec, regionUSStateFacetSpec);

                // Finally, focus can be set because we have our context and content.
                this.setFocusAsNeeded();
            });
        }
        else {
            // The only use for biography search fields is with a search, not a born this day, so only bother
            // with fetching it from the service here:
            var bioSearchFieldsMask = this.userSettingsManagerService.currentBioSearchFieldsMask();
            this.historyMakerService.getHistoryMakers(this.myCurrentQuery, bioSearchFieldsMask, this.myCurrentSearchLastNameOnlyFlag,
              this.myCurrentSearchPreferredNameOnlyFlag, givenPage, givenPageSize, genderFacetSpec, birthDecadeFacetSpec,
              makerFacetSpec, jobFacetSpec, lastInitialFacetSpec, regionUSStateFacetSpec, sortField, sortInDescendingOrder).pipe(takeUntil(this.ngUnsubscribe)).subscribe(retSet => {
                this.myCurrentPage = givenPage;
                this.myCurrentPageSize = givenPageSize;
                this.myModelledPageSize = givenPageSize;
                this.biographies = retSet.biographies;
                this.totalBiographiesFound = retSet.count;
                this.initializeUSStateCounts(addFilterPrefixToMapKey);
                this.initializeTitleAndPaging(givenPage, givenPageSize, retSet.count, titleLabelSuffix);
                this.processFacetsFromService(retSet.count, retSet.facets, genderFacetSpec, makerFacetSpec, jobFacetSpec, birthDecadeFacetSpec, lastInitialFacetSpec, regionUSStateFacetSpec);

                // Finally, focus can be set because we have our context and content.
                this.setFocusAsNeeded();
            });
        }
    }

    hasActiveFacet(): boolean {
        return this.activeFacets && this.activeFacets.length > 0;
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
        else if (this.pending_signalFocusMoveToFilterMenu_LastInitial) {
            this.signalFocusMoveToFilterMenu_LastInitial = true;
            focusSetElsewhere = true;
        }
        else if (this.pending_signalFocusMoveToMenu_LastInitial) {
            this.signalFocusMoveToMenu_LastInitial = true;

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
            for (var i = 0; i < BioFilterFamilyTypeCount; i++) {
                if (this.facetFamilies[i].isAllowedToBeShown && (i == BioFilterFamilyType.LastNameInitial ||
                  (this.facetFamilies[i].facets && this.facetFamilies[i].facets.length > 0))) {
                    // Found one to focus!  Set its flag.  Funny clause above is due to LastNameInitial not using facets set as others
                    // due to its unique UI.
                    this.facetFamilies[i].signalFocusToFamilyParent = true;
                    focusSetElsewhere = true;
                    break; // focus on first one only, of course, so break out of loop
                }
            }
        }
        else if (this.pending_bioFilterFamily != BioFilterFamilyType.None &&
          this.pending_bioFilterValue != "") {
            // Signal that the filter within this family with value pending_bioFilterValue is to be focused.
            this.facetFamilies[this.pending_bioFilterFamily].signalItemToFocus = this.pending_bioFilterValue;

            focusSetElsewhere = true;
        }

        // Check on scroll and focus to selected biography item once everything is set up, but only do focus/scroll action
        // if focus is not set to something else above.
        var selectedItem = this.userSettingsManagerService.currentBioIDToFocus();
        if (selectedItem && selectedItem.length > 0) {
            if (!focusSetElsewhere) {
                this.signalFocusToBiographyID = selectedItem; // can focus to biography item because nothing else was picked earlier
                focusSetElsewhere = true;
            }

            // Once used, or once something else was focused on via "focusSetElsewhere", clear the bio id to focus.
            this.userSettingsManagerService.updateBioIDToFocus(this.globalState.NO_ACCESSION_CHOSEN);
        }

        // Forget some signalling to other routes, given this context of "Maker Set" such as there is no selected mixtape or story.
        this.userSettingsManagerService.updateMixtapeIDToFocus(this.globalState.NOTHING_CHOSEN); // no mixtape context
        this.userSettingsManagerService.updateStoryIDToFocus(this.globalState.NOTHING_CHOSEN); // no single story context

        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            if (!focusSetElsewhere)
                // Set default focus to the title for this route, since we did internally route
                // in the SPA (single page application)
                // (as it is the target for skip-to-main content as well)
                this.signalFocusToTitle = true;
        }

        this.clearPendingFocusInstructions();
    }

    private clearPendingFocusInstructions() {
        // Clean up "pending" status so that it will not leak into any future pending/routing/signalling activity.
        // This is the "pending" which changes signals for what to focus on, not the signals themselves which need to remain
        // so that upon component construction the right control gets focused.  Clearing signals happens right before route navigation.
        // Clearing "pending" happens after the pending instructions are all considered.
        this.pending_signalFocusMoveToMenu_LastInitial = false;
        this.pending_signalFocusMoveToFilterMenu_LastInitial = false;
        this.pending_focusOnPageOneButton = false;
        this.pending_focusOnFinalPageButton = false;
        this.pending_focusOnOpenFilterButton = false;
        this.pending_focusOnCloseFilterButton = false;
        this.pending_removeFilterButtonIndicator = -1;
        this.pending_focusToFirstShownFilterFamily = false;
        this.pending_bioFilterFamily = BioFilterFamilyType.None;
        this.pending_bioFilterValue = "";
    }

    private initializeUSStateCounts(addFilterPrefixToMapKey: boolean) {
        var postedDistribution: USMapDistribution = new USMapDistribution();
        postedDistribution.mapRegionListTitle = "Birth State";
        postedDistribution.exceptionDescription = ""; // might get filled in later if the count for no-region is nonzero
        if (addFilterPrefixToMapKey) {
            postedDistribution.keyTitle = "Birth State for Filtered HistoryMakers";
            postedDistribution.keyEntitySingular = "filtered HistoryMaker";
            postedDistribution.keyEntityPlural = "filtered HistoryMakers";

        }
        else {
            postedDistribution.keyTitle = "Birth State of HistoryMaker";
            postedDistribution.keyEntitySingular = "HistoryMaker";
            postedDistribution.keyEntityPlural = "HistoryMakers";
        }
        postedDistribution.verbLeadIn = "are born in";
        postedDistribution.verbLeadInSingular = "is born in";
        postedDistribution.verbPhrase = "Birthplace of";
        postedDistribution.keySuffix = "born here"; // used to compose key message of form: "1 HistoryMaker born here" or "20 HistoryMakers born here"

        postedDistribution.keyEntitySetCount = 0; // update later when this.biographies is set
        postedDistribution.count = [];
        // Initialize with zero counts, and set later with actual U.S. state counts from the birthState facet on this.biographies.
        for (var i = 0; i <= 51; i++)
            postedDistribution.count.push(0);

        this.USStateDistribution = postedDistribution;
    }

    public updateViewOptions(newPicOptionSetting: boolean, newTextOptionSetting: boolean) {
        if (this.cardView != newPicOptionSetting || this.textView != newTextOptionSetting) {
            this.cardView = newPicOptionSetting;
            this.textView = newTextOptionSetting;
            // Also, change the title for the page (needed when moving in/out of a card or text view and the map view
            // since the map view is for the WHOLE set and not a page of the WHOLE set).

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

    public tabIndexForLastInitialOptions(childIndicator: number): number {
        // !!!TBD!!! NOTE: if we try to be "clever" and NOT allow tab to progress through the last initial options,
        // then we run into this error with Angular event/view updating on using the Escape key to exit out of the menu
        // as asked for by accessibility experts:
        //
        // ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value for 'attr.tabindex': '-1'. Current value: '0'.
        //
        // Rather than debug that fully, instead we are allowing either tab or arrow keys to progress through the last
        // initial options, i.e., they are all focusable.  Ideally, that works and passes.  If so, this call can be retired.
        // For now, instead of this ever being called in the renderer (for the li options within the my-panel-of-buttons
        // setting for tabindex, so 2 occurrences), instead just use "tabindex='0'" in those 2 instances and this function
        // is unused.

        // Extra work to assign 0 or -1 to options list, with 0 for the first option if there are none that are marked as focused; -1 otherwise
        var focusedLastInitialOptionValue: number = -1;
        if (this.lastInitialFacets && this.lastInitialFacets.length > 0) {
            for (var i = 0; i < this.lastInitialFacets.length; i++) {
                // Seek a focused facet.
                if (this.lastInitialFacets[i].focused) {
                    focusedLastInitialOptionValue = i;
                    break;
                }
            }
            if (focusedLastInitialOptionValue == -1)
                focusedLastInitialOptionValue = 0; // when nothing is focused, consider first item as focused when setting tabIndex to 0 or -1 as is done here
            // See https://www.w3.org/TR/2016/WD-wai-aria-practices-1.1-20160317/examples/radio/radio.html,
            // https://www.w3.org/TR/2017/WD-wai-aria-practices-1.1-20170628/examples/radio/radio-1/radio-1.html
            if (childIndicator == focusedLastInitialOptionValue)
                return 0;
            else
                return -1;
        }
        else
            return -1;
    }

    public onFocusChangeLastInitialOptions(childIndicator: number, isFocused: boolean) {
        if (this.lastInitialFacets && childIndicator >= 0 && childIndicator < this.lastInitialFacets.length)
        {
            this.lastInitialFacets[childIndicator].focused = isFocused;
        }
    }

    public setLastInitialOptions(eventCode: string, childIndicator: number, lastInitialID: string, isInFilterMenu: boolean) {
        var maxIndex: number = this.lastInitialFacets.length - 1;
        if (eventCode == " " || eventCode == "Enter") {
            for (var i = 0; i <= maxIndex; i++) {
                if (this.lastInitialFacets[i].ID == lastInitialID) {
                    this.toggleLastInitialFacet(this.lastInitialFacets[i], isInFilterMenu);
                    break;
                }
            }
        }
        else if (eventCode == "Escape") {
            // Close the last initial menu and set focus to it.
            this.closeLastInitialPanelAndSetFocusToIt(isInFilterMenu);
        }
        else { // Possibly move focus...
            var nextIndex: number = -1; // value less than zero indicates no focus change anticipated...
            if (eventCode == "ArrowDown" || eventCode == "ArrowUp" || eventCode == "ArrowRight" || eventCode == "ArrowLeft") {
                if (eventCode == "ArrowDown" || eventCode == "ArrowRight") {
                    nextIndex = childIndicator + 1;
                    if (nextIndex > maxIndex)
                        nextIndex = 0;
                }
                else if (eventCode == "ArrowUp" || eventCode == "ArrowLeft") {
                    nextIndex = childIndicator - 1;
                    if (nextIndex < 0)
                        nextIndex = maxIndex;
                }
            }
            else if (this.lastInitialFacets && this.lastInitialFacets.length > 0) {
                var upperCaseInput: string = eventCode.toUpperCase();
                // For a long list of letters (the last name initial), let user type a letter ('s' or 'S' to match S) to set focus to it.
                for (var i = 0; i < this.lastInitialFacets.length; i++) {
                    if (this.lastInitialFacets[i].value == upperCaseInput) {
                        nextIndex = i;
                        break;
                    }
                }
            }
            if (nextIndex >= 0) {
                if (isInFilterMenu) {
                    if (nextIndex < this.lastInitialItemsInFilterMenu.length) {
                        let lastInitialOptionElements: ElementRef[] = this.lastInitialItemsInFilterMenu.toArray();
                        lastInitialOptionElements[nextIndex].nativeElement.focus();
                    }
                }
                else {
                    if (nextIndex < this.lastInitialItems.length) {
                        let lastInitialOptionElements: ElementRef[] = this.lastInitialItems.toArray();
                        lastInitialOptionElements[nextIndex].nativeElement.focus();
                    }
                }
            }
        }
    }

    private initTitleForPage() {
        // Helper function to assign to this.biographySetTitle and this.screenReaderSummaryTitle based in part on
        // this.cardView, this.textView, this.totalBiographiesFound, this.myCurrentPageSize, and this.fullResultsSetTitleSuffix.
        // Two approaches for title: if cardView or textView, we look at a page of results only, so put page info in title.
        // But, for map, look at ALL the results, so do not put page info in title.
        if (!this.cardView && !this.textView) {
            if (this.totalBiographiesFound > 0) {
                this.biographySetTitle = "Map view of " + this.totalBiographiesFound + " " + this.fullResultSetTitleSuffix;
                this.screenReaderSummaryTitle = "Map view of HistoryMakers set";
            }
            else {
                this.biographySetTitle = "Map view featuring 0 HistoryMakers";
                this.screenReaderSummaryTitle = "Map view of empty HistoryMakers set";
            }
        }
        else {
            var countReturned: number;
            var totalPages: number = Math.ceil(this.totalBiographiesFound / this.myCurrentPageSize);

            if (this.biographies != null && this.biographies.length > 0)
                countReturned = this.biographies.length;
            else
                countReturned = 0;

            if (countReturned > 0) {
                if (this.totalBiographiesFound > this.myCurrentPage * this.myCurrentPageSize) {
                    this.biographySetTitle = this.totalBiographiesFound + " " + this.fullResultSetTitleSuffix + ", page " + this.myCurrentPage + " of " + totalPages;
                } else {
                    // Perhaps everything fits on first page (count <= page size).  If so, don't tack on ", page 1 of 1"
                    if (this.myCurrentPage == 1)
                        this.biographySetTitle = this.totalBiographiesFound + " " + this.fullResultSetTitleSuffix;
                    else // everything does NOT fit on last page of results, but it is true that there is no next page.  Show ", page X of Y"
                        this.biographySetTitle = this.totalBiographiesFound + " " + this.fullResultSetTitleSuffix + ", page " + this.myCurrentPage + " of " + totalPages;
                }
                this.screenReaderSummaryTitle = "Maker Directory Biography Set";

            }
            else { // No stories, perhaps because caller asked for page 1000 of result set that only has 20 pages....
                if (this.myCurrentPage != 1) {
                    this.biographySetTitle = "No HistoryMakers for page " + this.myCurrentPage + " (" + this.myCurrentPageSize + " per page)";
                }
                else {
                    if (this.myBornThisTimeFilterFlag)
                        this.biographySetTitle = "No HistoryMakers born this day."; // NOTE: here we assume "time" is a "day" rather than "this week"
                    else
                        this.biographySetTitle = "No results for " + this.fullResultSetTitleSuffix;
                }
                this.screenReaderSummaryTitle = "Empty HistoryMakers set";
            }
        }
        // NOTE: At request of our accessibility expert, a descriptive browser title is preferred over a shorter name without paging details,
        // such as "HistoryMakers Biographies Set", so use the detailed title with suffix indicating "Maker Directory".
        this.titleManagerService.setTitle(this.biographySetTitle + " | Maker Directory");
        this.liveAnnouncer.announce(this.biographySetTitle); // NOTE: using LiveAnnouncer to eliminate the double-speak of a heading formerly tagged with aria-live
    }

    private initializeTitleAndPaging(givenPage: number, givenPageSize: number, totalCount: number,
      titleLabelSuffixSoFar: string) {
        // Helper function during initial load of contents.
        // Assumptions: this.myCurrentQuery and this.myBornThisTimeFilterFlag already set.
        var countReturned: number;
        var titleLabelSuffix: string = titleLabelSuffixSoFar;
        var totalPages: number = Math.ceil(totalCount / givenPageSize);
        // For some sets, have total be X HistoryMakers Found; for others, just X HistoryMakers
        var addFoundSuffixToTotalSummary: boolean = false;
        if (totalCount <= 0) {
            this.pages = [];
            this.lastPageInSet = 0;
        }
        else
        {  // Provide numbers for pagination
            this.lastPageInSet = totalPages;
            if (totalPages <= 10 || givenPage <= 6) {
                this.pages = [];
                for (let i = 1; i < 10; i++) {
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

        if (this.biographies != null && this.biographies.length > 0)
            countReturned = this.biographies.length;
        else
            countReturned = 0;

        if (countReturned != 1)
            titleLabelSuffix += "s"; // e.g., "0 HistoryMakers" or "23 HistoryMakers"
        if (this.myBornThisTimeFilterFlag) {
            titleLabelSuffix += " born this day"; // NOTE: here we assume "time" is a "day" rather than "this week", i.e., service call getHistoryMakersBornThisDay used
            addFoundSuffixToTotalSummary = true; // for born this day, tack on a " Found" to this.totalBiographiesFoundSuffix
        }
        else if (this.myCurrentQuery != null && this.myCurrentQuery.length > 0 && this.myCurrentQuery != "*") {
            // decorate the title based on search parameters cached in the object state: this.myCurrentQuery, etc.
            titleLabelSuffix += " matching";
            if (this.myCurrentSearchLastNameOnlyFlag) {
                titleLabelSuffix += " last name";
            }
            else if (this.myCurrentSearchPreferredNameOnlyFlag) {
                titleLabelSuffix += " preferred name";
            }
            titleLabelSuffix += ": " + this.myCurrentQuery;
            addFoundSuffixToTotalSummary = true; // for any given query, tack on a " Found" to this.totalBiographiesFoundSuffix
        }

        this.fullResultSetTitleSuffix = titleLabelSuffix.trim(); // needed when we switch from cardView or textView to the map view of all results instead of a page of results
        this.initTitleForPage();

        // Set paging based on page size, total count, current page.
        if (countReturned > 0) {
            this.SetPagingInterface((givenPage > 1), (totalCount > givenPage * givenPageSize));
        }
        else { // No stories, perhaps because caller asked for page 1000 of result set that only has 20 pages....
            this.SetPagingInterface((givenPage != 1), false);
        }

        if (totalCount == 1)
            this.totalBiographiesFoundSuffix = "1 HistoryMaker";
        else
            this.totalBiographiesFoundSuffix = totalCount.toLocaleString() + " HistoryMakers";
        if (addFoundSuffixToTotalSummary)
            this.totalBiographiesFoundSuffix += " Found";
        else // make clear this set is the "total" rather than some subset of found items
            this.totalBiographiesFoundSuffix += " Total";
    }

    private processFacetsFromService(totalCount: number, returnedFacets: Facets, genderFacetSpec: string, makerFacetSpec: string, jobFacetSpec: string, birthDecadeFacetSpec: string,
      lastInitialFacetSpec: string, regionUSStateFacetSpec: string) {
        var i: number;

        for (i = 0; i < BioFilterFamilyTypeCount; i++)
            this.facetFamilies[i].facets = []; // start off with empty facets across all families
        this.lastInitialFacets = []; // note "last initial" special UI has its own data structure here in lastInitialFacets rather than this.facetFamilies[BioFilterFamilyType.LastNameInitial].facets

        this.activeFacets = [];

        var oneFacet: FacetDetail;
        // Handle gender; be picky and allow only one gender in genderFacetSpec, "F" or "M", to be recognized:
        for (i = 0; i < returnedFacets.gender.length; i++) {
            if (returnedFacets.gender[i].value == "F") {
                oneFacet = new FacetDetail();
                oneFacet.value = this.globalState.FEMALE_MARKER;
                oneFacet.ID = this.globalState.FEMALE_ID;
                oneFacet.count = returnedFacets.gender[i].count;
                if (genderFacetSpec == "F") oneFacet.active = true;
                this.facetFamilies[BioFilterFamilyType.Gender].facets.push(oneFacet);
            }
            else if (returnedFacets.gender[i].value == "M") {
                oneFacet = new FacetDetail();
                oneFacet.value = this.globalState.MALE_MARKER;
                oneFacet.ID = this.globalState.MALE_ID;
                oneFacet.count = returnedFacets.gender[i].count;
                if (genderFacetSpec == "M") oneFacet.active = true;
                this.facetFamilies[BioFilterFamilyType.Gender].facets.push(oneFacet);
            }
        }

        // Handle last initial; be picky and allow only one upper case letter in lastInitialFacetSpec, e.g., "A" or "C", to be recognized:
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase().split('');
        var unsortedLastInitialFacets: FacetDetail[] = [];
        var candidateID: number;
        for (i = 0; i < returnedFacets.lastInitial.length; i++) {
            candidateID = alphabet.indexOf(returnedFacets.lastInitial[i].value); // ID is 0 for A, 1 for B, etc.
            if (candidateID >= 0) {
                oneFacet = new FacetDetail();
                oneFacet.ID = candidateID.toString(); // ID is "0" for A, "1" for B, etc.
                oneFacet.count = returnedFacets.lastInitial[i].count;
                oneFacet.value = returnedFacets.lastInitial[i].value; // value is given in returnedFacets as upper case single letter initial ABCD...
                if (lastInitialFacetSpec == oneFacet.value) oneFacet.active = true;
                unsortedLastInitialFacets.push(oneFacet);
            }
        }
        // Sort unsortedLastInitialFacets before assigning to this.lastInitialFacets alphabetically as well.
        // (The count is de-emphasized for this particular facet in favor of the value with the sorted value getting prominence.)
        this.lastInitialFacets = unsortedLastInitialFacets.sort((a: FacetDetail, b: FacetDetail) => {
            var aAsNum = +a.ID;
            var bAsNum = +b.ID;
            if (aAsNum < bAsNum) {
                return -1;
            } else if (aAsNum > bAsNum) {
                return 1;
            } else {
                return 0;
            }
        });
        // NOTE: because Last Initial UI is different, we are not using this.facetFamilies[BioFilterFamilyType.LastNameInitial].facets

        // Handle maker:
        var makerIDsInFilter: string[] = makerFacetSpec.split(",");
        for (i = 0; i < returnedFacets.makerCategories.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.makerCategories[i].value;
            oneFacet.count = returnedFacets.makerCategories[i].count;
            oneFacet.value = this.historyMakerService.getMaker(oneFacet.ID); // value is the readable string
            if (makerIDsInFilter.indexOf(oneFacet.ID) !== -1) oneFacet.active = true;
            this.facetFamilies[BioFilterFamilyType.Category].facets.push(oneFacet);
        }
        // Handle job type:
        var jobIDsInFilter: string[] = jobFacetSpec.split(",");
        for (i = 0; i < returnedFacets.occupationTypes.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.occupationTypes[i].value;
            oneFacet.count = returnedFacets.occupationTypes[i].count;
            oneFacet.value = this.historyMakerService.getJobType(oneFacet.ID); // value is the readable string
            if (jobIDsInFilter.indexOf(oneFacet.ID.toString()) !== -1) oneFacet.active = true;
            this.facetFamilies[BioFilterFamilyType.JobType].facets.push(oneFacet);
        }
        // Handle "decade" (a decade ten-year marker):
        var decadeValuesInFilter: string[] = birthDecadeFacetSpec.split(",");
        for (i = 0; i < returnedFacets.birthYear.length; i++) {
            oneFacet = new FacetDetail();
            oneFacet.ID = returnedFacets.birthYear[i].value.toString(); // ID is "1960" for the numeric value 1960
            oneFacet.count = returnedFacets.birthYear[i].count;
            oneFacet.value = "Born in " + returnedFacets.birthYear[i].value + "s"; // value is "Born in " and string form of the numeric value followed by "s", e.g., Born in 1950s for 1950
            if (decadeValuesInFilter.indexOf(oneFacet.ID.toString()) !== -1) oneFacet.active = true;
            this.facetFamilies[BioFilterFamilyType.BirthDecade].facets.push(oneFacet);
        }

        // Handle region (US state), and also use this information to initialize this.USStateDistribution.count values across the regions (50 states plus DC)
        var regionCount: number[] = [];
        for (i = 0; i <= 51; i++)
            regionCount.push(0); // slot 0 is "unknown", then 51 for 50 states plus DC
        var countForNonUSState: number = 0;
        var regionUSStateIDsInFilter: string[] = regionUSStateFacetSpec.split(",");
        var numericIndexForMap: number;
        for (i = 0; i < returnedFacets.birthState.length; i++) {
            if (returnedFacets.birthState[i].value == "") {
                countForNonUSState = returnedFacets.birthState[i].count;  // The empty value "" is for non-US state, which perhaps has a nonzero count
                regionCount[0] = countForNonUSState;
            }
            else {
                oneFacet = new FacetDetail();
                oneFacet.count = returnedFacets.birthState[i].count;
                oneFacet.ID = returnedFacets.birthState[i].value; // two-letter code e.g., NY or PA or DC
                oneFacet.value = this.globalState.NameForUSState(oneFacet.ID); // use Pennsylvania instead of PA
                numericIndexForMap = this.globalState.MapIndexForUSState(oneFacet.ID);
                regionCount[numericIndexForMap] = oneFacet.count;

                if (regionUSStateIDsInFilter.indexOf(oneFacet.ID.toString()) !== -1)
                    oneFacet.active = true;
                if (this.facetFamilies[BioFilterFamilyType.BirthState].facets.length < this.MAX_REGION_US_STATES_TO_SHOW_IN_FILTER_AREA)
                    this.facetFamilies[BioFilterFamilyType.BirthState].facets.push(oneFacet);
            }
        }
        this.USStateDistribution.keyEntitySetCount = totalCount;
        this.USStateDistribution.regionIDsAlreadyInFilter = regionUSStateFacetSpec.trim();
        this.USStateDistribution.count = regionCount;

        if (countForNonUSState > 0) {
            // Setting exceptionDescription to read: NOTE: # HistoryMakers <suffix> or # filtered HistoryMakers <suffix>
            if (countForNonUSState == 1)
                this.USStateDistribution.exceptionDescription = "NOTE: 1 " + this.USStateDistribution.keyEntitySingular + this.NO_US_BIRTHSTATE_FOR_SOME_LABEL_SUFFIX;
            else
                this.USStateDistribution.exceptionDescription = "NOTE: " + countForNonUSState + " " + this.USStateDistribution.keyEntityPlural + this.NO_US_BIRTHSTATE_FOR_SOME_LABEL_SUFFIX;
        }

        if (genderFacetSpec.length > 0 || makerFacetSpec.length > 0 || jobFacetSpec.length > 0 || birthDecadeFacetSpec.length > 0 ||
          lastInitialFacetSpec.length > 0 || regionUSStateFacetSpec.length > 0)
            this.updateActiveFacetsToMatchFilter(genderFacetSpec, makerFacetSpec, jobFacetSpec, birthDecadeFacetSpec, lastInitialFacetSpec, regionUSStateFacetSpec);
    }

    private updateActiveFacetsToMatchFilter(genderFacetSpec: string, makerFacetSpec: string, jobFacetSpec: string, birthDecadeFacetSpec: string,
      lastInitialFacetSpec: string, regionUSStateFacetSpec: string) {
        // Update activeFacets to match the specification from the input parameters to this function.
        // Order is as we want it in renderer for listing UI for these active entries:
        // last initial, category, gender, birth decade, birth state, job
        // Since items are put into activeFacets in this order in this call, there is no need
        // to use the helper function insertIntoProperPlaceNewActiveFacetItem from within updateActiveFacetsToMatchFilter.

        this.activeFacets = [];

        var oneFacet: FacetWithFamily;
        var i: number;
        var itemInCSVList: string[];
        var j: number;
        var valueToUse: string;
        var IDToCheck: string;


        // NOTE: Be picky: allow only a single last initial facet specification:
        if (lastInitialFacetSpec != null && lastInitialFacetSpec.length == 1) {
            const alphabet = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase().split('');
            var legalInitialID = alphabet.indexOf(lastInitialFacetSpec); // ID is 0 for A, 1 for B, etc., with -1 for not being in upper case range of [A,Z]
            if (legalInitialID >= 0) {
                oneFacet = new FacetWithFamily();
                oneFacet.setID = BioFilterFamilyType.LastNameInitial;
                oneFacet.ID = legalInitialID.toString();
                oneFacet.value = lastInitialFacetSpec;
                this.activeFacets.push(oneFacet);
            }
        }

        if (makerFacetSpec != null) {
            itemInCSVList = makerFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[BioFilterFamilyType.Category].facets.length; j++) {
                    if (this.facetFamilies[BioFilterFamilyType.Category].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[BioFilterFamilyType.Category].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new FacetWithFamily();
                    oneFacet.setID = BioFilterFamilyType.Category;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }

        // NOTE: Be picky: allow only a single gender facet specification:
        if (genderFacetSpec != null && genderFacetSpec.length == 1) {
            if (genderFacetSpec == "M") {
                oneFacet = new FacetWithFamily();
                oneFacet.setID = BioFilterFamilyType.Gender;
                oneFacet.ID = this.globalState.MALE_ID;
                oneFacet.value = this.globalState.MALE_MARKER;
                this.activeFacets.push(oneFacet);
            }
            else if (genderFacetSpec == "F") {
                oneFacet = new FacetWithFamily();
                oneFacet.setID = BioFilterFamilyType.Gender;
                oneFacet.ID = this.globalState.FEMALE_ID;
                oneFacet.value = this.globalState.FEMALE_MARKER;
                this.activeFacets.push(oneFacet);
            }
        }

        if (birthDecadeFacetSpec != null) {
            itemInCSVList = birthDecadeFacetSpec.split(",");
            for (i = 0; i < itemInCSVList.length; i++) {
                IDToCheck = itemInCSVList[i];
                valueToUse = "";
                for (j = 0; j < this.facetFamilies[BioFilterFamilyType.BirthDecade].facets.length; j++) {
                    if (this.facetFamilies[BioFilterFamilyType.BirthDecade].facets[j].ID == IDToCheck) {
                        valueToUse = this.facetFamilies[BioFilterFamilyType.BirthDecade].facets[j].value;
                        break;
                    }
                }
                if (valueToUse != "") {
                    oneFacet = new FacetWithFamily();
                    oneFacet.setID = BioFilterFamilyType.BirthDecade;
                    oneFacet.ID = IDToCheck;
                    oneFacet.value = valueToUse;
                    this.activeFacets.push(oneFacet);
                }
            }
        }

        if (regionUSStateFacetSpec != null) {
          itemInCSVList = regionUSStateFacetSpec.split(",");
          for (i = 0; i < itemInCSVList.length; i++) {
              IDToCheck = itemInCSVList[i];
              valueToUse = "";
              for (j = 0; j < this.facetFamilies[BioFilterFamilyType.BirthState].facets.length; j++) {
                  if (this.facetFamilies[BioFilterFamilyType.BirthState].facets[j].ID == IDToCheck) {
                      valueToUse = this.facetFamilies[BioFilterFamilyType.BirthState].facets[j].value;
                      break;
                  }
              }
              if (valueToUse != "") {
                  oneFacet = new FacetWithFamily();
                  oneFacet.setID = BioFilterFamilyType.BirthState;
                  oneFacet.ID = IDToCheck;
                  oneFacet.value = valueToUse;
                  this.activeFacets.push(oneFacet);
              }
          }
      }

      if (jobFacetSpec != null) {
          itemInCSVList = jobFacetSpec.split(",");
          for (i = 0; i < itemInCSVList.length; i++) {
              IDToCheck = itemInCSVList[i];
              valueToUse = "";
              for (j = 0; j < this.facetFamilies[BioFilterFamilyType.JobType].facets.length; j++) {
                  if (this.facetFamilies[BioFilterFamilyType.JobType].facets[j].ID == IDToCheck) {
                      valueToUse = this.facetFamilies[BioFilterFamilyType.JobType].facets[j].value;
                      break;
                  }
              }
              if (valueToUse != "") {
                  oneFacet = new FacetWithFamily();
                  oneFacet.setID = BioFilterFamilyType.JobType;
                  oneFacet.ID = IDToCheck;
                  oneFacet.value = valueToUse;
                  this.activeFacets.push(oneFacet);
              }
          }
      }
  }

  private insertIntoProperPlaceNewActiveFacetItem(givenNewFacet: FacetWithFamily) {
      // Update activeFacets such that all categories are together, then all gender,
      // then all birth decade, etc., rather than last added always goes to end of list.
      // Order is as we want it in renderer for listing UI for these active entries:
      // last initial, category, gender, birth decade, birth state, job

      // Logic: Look for where item should go.  If there are none of the item's set there yet, put it in as first.
      // If there are some of the set, put it to the end of the set.
      var insertionPoint: number = 0;
      var indexSoFar: number = 0;
      // Walk to the end of any last-initial entries
      while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == BioFilterFamilyType.LastNameInitial)
          indexSoFar++;
      if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != BioFilterFamilyType.LastNameInitial) {
          // Keep moving in the list, now past any category already listed.
          while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == BioFilterFamilyType.Category)
              indexSoFar++;

          if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != BioFilterFamilyType.Category) {
              // Keep moving in the list, now past any gender already listed.
              while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == BioFilterFamilyType.Gender)
                  indexSoFar++;

              if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != BioFilterFamilyType.Gender) {
                  // Keep moving in the list, now past any birth decade already listed.
                  while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == BioFilterFamilyType.BirthDecade)
                      indexSoFar++;

                  if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != BioFilterFamilyType.BirthDecade) {
                      // Keep moving in the list, now past any birth state already listed.
                      while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == BioFilterFamilyType.BirthState)
                          indexSoFar++;

                      if (indexSoFar < this.activeFacets.length && givenNewFacet.setID != BioFilterFamilyType.BirthState) {
                          // Keep moving in the list, now past any job type listed.  As this is always the last type listed
                          // based on comment above, simply move now to the end of the list.
                          indexSoFar = this.activeFacets.length;
                          // FYI, this is the same as doing:
                          // while (indexSoFar < this.activeFacets.length && this.activeFacets[indexSoFar].setID == BioFilterFamilyType.JobType)
                          //    indexSoFar++;
                      }
                  }
              }
          }
      }
      this.activeFacets.splice(insertionPoint, 0, givenNewFacet); // put newly added facet in where it belongs
  }

  private setOptionsAndRouteToPage(isFilterForcedUpdate: boolean, overrideToBornThisTime: boolean, queryToUse: string, pageToLoad: number, pageSize: number,
      searchLastNameOnlyFlag: boolean, searchPreferredNameOnlyFlag: boolean, sortOrderSpecifier: number, filterSpecInPlay: string,
      focusFirstOnLastInitialMenu: boolean, focusFirstOnLastInitialFilterMenu: boolean,
      isClearActionFromRemoveFilterButton: boolean, whichRemoveFilterButtonToFocus: number,
      focusWithinFilterFamily: BioFilterFamilyType, focusValueWithinFilterFamily: string,
      focusOnCloseOutFilterInterface: boolean, focusOnOpenUpFilterInterface: boolean) {

        // Set up focus flags so that after routing we set focus to appropriate element.
        this.pending_signalFocusMoveToMenu_LastInitial = focusFirstOnLastInitialMenu;
        this.pending_signalFocusMoveToFilterMenu_LastInitial = focusFirstOnLastInitialFilterMenu;
        this.pending_bioFilterFamily = focusWithinFilterFamily;
        this.pending_bioFilterValue = focusValueWithinFilterFamily;
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

        var moreOptions = [];
        // Accumulate routing parameters specifying filter specification, page information, etc.

        // NOTE: filter-forced-update, ffu, is a new parameter added to force a contents refresh because the filter changed contents or
        // became empty and so regardless of any other changes, a contents refresh is demanded (by setting the ffu parameter).
        if (isFilterForcedUpdate)
            moreOptions['ffu'] = "1";

        if (this.showingFilterMenu)
            moreOptions['menu'] = "1";

        if (this.textView)
            moreOptions['tv'] = "1";
        else if (!this.cardView)
            moreOptions['mv'] = "1"; // NOTE: !textView && !cardView means it is map view, i.e., 'mv'

        if (overrideToBornThisTime) {
            // NOTE: "born this time" always trumps the query specification and is used in its place
            moreOptions['bt'] = "1";
        }
        else {
            if (queryToUse != null && queryToUse.length > 0)
                moreOptions['q'] = this.globalState.cleanedQueryRouterParameter(queryToUse);
            if (searchLastNameOnlyFlag)
                moreOptions['ln'] = "1"; // search just the last name field
            else
                moreOptions['ln'] = "0";
            if (searchPreferredNameOnlyFlag)
                moreOptions['pn'] = "1"; // search just the preferred name field
            else
                moreOptions['pn'] = "0";
            moreOptions['so'] = sortOrderSpecifier;
        }
        moreOptions['pg'] = pageToLoad;
        moreOptions['pgS'] = pageSize;
        if (filterSpecInPlay.length > 0) {
            moreOptions['spec'] = filterSpecInPlay; // NOTE assumption that filter spec has no "special" characters, i.e., it does not need to be cleaned via this.globalState.cleanedRouterParameter()

            // NOTE:  if we are forcing the update, given that we are DOING and not CLEARING filter(s), then also update tracking,
            // flagged by setting a 'ut' parameter to 1.
            if (isFilterForcedUpdate)
                moreOptions['ut'] = "1";
        }
        // Make sure all signals are cleared regarding focus.  Any new focus decisions are made based on pending flags,
        // not signal flags, so simplify bookkeeping and just have all signals cleared before routing.
        this.clearSignalsForCurrentFocusSetting();
        this.router.navigate(['/all', moreOptions]);
    }

    private clearSignalsForCurrentFocusSetting() {
        this.signalFocusToBiographyID = this.globalState.NO_ACCESSION_CHOSEN;
        this.signalFocusMoveToFirstLastInitial = false;
        this.signalFocusMoveToFirstLastInitial_FilterMenu = false;
        this.signalFocusMoveToMenu_LastInitial = false;
        this.signalFocusMoveToFilterMenu_LastInitial = false;
        this.signalFocusToPageOne = false;
        this.signalFocusToFinalPage = false;
        this.signalFocusToCloseFilterButton = false;
        this.signalFocusToOpenFilterButton = false;
        this.signalFocusToTitle = false;
        this.signalFocusToRemoveFilterButtonIndicator = -1;
        for (var i = 0; i < BioFilterFamilyTypeCount; i++) {
            this.facetFamilies[i].signalItemToFocus = "";
            this.facetFamilies[i].signalFocusToFamilyParent = false;
        }
    }

    private SetPagingInterface(goBackPageOK: boolean, goFwdPageOK: boolean) {
        this.needPrevPage = goBackPageOK;
        this.needNextPage = goFwdPageOK;
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
            this.biographySetTitle = "Fetching Page " + newPageIdentifier + "... (in progress)";
            this.screenReaderSummaryTitle = "Maker Directory, Page Fetch Pending";

            this.titleManagerService.setTitle(this.screenReaderSummaryTitle);
        }

        // Accumulate routing parameters specifying filter specification, page information, etc.
        this.setOptionsAndRouteToPage(filterPageSortPageSizeEtcForcedUpdate, this.myBornThisTimeFilterFlag, this.myCurrentQuery, newPageIdentifier, this.myCurrentPageSize,
            this.myCurrentSearchLastNameOnlyFlag, this.myCurrentSearchPreferredNameOnlyFlag, this.myCurrentBiographySearchSorting, this.specStringFromActiveFacets(),
            false, false, false, -1, BioFilterFamilyType.None, "", false, false);
    }

    private specStringFromActiveFacets(): string {
        var filterSpec: string;
        var genderFacetSpec: string = "";
        var makerFacetSpec: string = "";
        var jobFacetSpec: string = "";
        var birthDecadeFacetSpec: string = "";
        var lastInitialSpec: string = "";
        var regionUSStateSpec: string = "";

        for (var i = 0; i < this.activeFacets.length; i++) {
            switch (this.activeFacets[i].setID) {
                case BioFilterFamilyType.LastNameInitial:
                    // NOTE: difference in logic here: enforcing ONE last name initial facet, rather than a list,
                    // and taking value as well rather than ID
                    lastInitialSpec = this.activeFacets[i].value;
                    break;
                case BioFilterFamilyType.Category:
                    makerFacetSpec = makerFacetSpec + this.activeFacets[i].ID + ",";
                    break;
                case BioFilterFamilyType.Gender:
                    // NOTE: difference in logic here: enforcing ONE gender facet, rather than a list
                    if (this.activeFacets[i].ID == this.globalState.FEMALE_ID)
                        genderFacetSpec = "F";
                    else if (this.activeFacets[i].ID == this.globalState.MALE_ID)
                        genderFacetSpec = "M";
                    break;
                case BioFilterFamilyType.BirthDecade:
                    birthDecadeFacetSpec = birthDecadeFacetSpec + this.activeFacets[i].ID + ",";
                    break;
                case BioFilterFamilyType.BirthState:
                    regionUSStateSpec = regionUSStateSpec + this.activeFacets[i].ID + ",";
                    break;
                case BioFilterFamilyType.JobType:
                    jobFacetSpec = jobFacetSpec + this.activeFacets[i].ID + ",";
                    break;
            }
        }

        // Take off extraneous ending commas for the list specs:
        if (makerFacetSpec.length > 0)
            makerFacetSpec = makerFacetSpec.substring(0, makerFacetSpec.length - 1);
        if (jobFacetSpec.length > 0)
            jobFacetSpec = jobFacetSpec.substring(0, jobFacetSpec.length - 1);
        if (birthDecadeFacetSpec.length > 0)
            birthDecadeFacetSpec = birthDecadeFacetSpec.substring(0, birthDecadeFacetSpec.length - 1);
        if (regionUSStateSpec.length > 0)
            regionUSStateSpec = regionUSStateSpec.substring(0, regionUSStateSpec.length - 1);

        if (genderFacetSpec == "" && makerFacetSpec == "" && jobFacetSpec == "" && birthDecadeFacetSpec == "" && lastInitialSpec == "" && regionUSStateSpec == "")
            filterSpec = "";
        else
            filterSpec = genderFacetSpec + "-" + makerFacetSpec + "-" + jobFacetSpec + "-" + birthDecadeFacetSpec + "-" + lastInitialSpec + "-" + regionUSStateSpec;
        return filterSpec;
    }

    clearActiveFacetChoice(facetSetOwningTheClear: BioFilterFamilyType, facetIDToClear: string,
      isClearActionFromRemoveFilterButton: boolean) {
        // NOTE: purpose of isClearActionFromRemoveFilterButton: communicate that after the facet is cleared
        // focus is to return to the remove-buttons list (if isClearActionFromRemoveFilterButton) or to the
        // facet set where a toggle action happened to turn back off a facet (if !isClearActionFromRemoveFilterButton)
        if (facetSetOwningTheClear == BioFilterFamilyType.None)
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
          // NOTE: expectation is that if facetSetOwningTheClear == BioFilterFamilyType.LastNameInitial then
          // isClearActionFromRemoveFilterButton is true, since special UI for last name initial requires different
          // parameters instead of "false, false" for when !isClearActionFromRemoveFilterButton; see
          // clearLastInitialFacet().
            this.processClearedFilter(false, false, isClearActionFromRemoveFilterButton, itemClearedOrder,
              facetSetOwningTheClear, facetValueToClear);
        }
    }

    clearLastInitialFacet(facetIDToClear: string,
        focusFirstOnLastInitialMenu: boolean, focusFirstOnLastInitialFilterMenu: boolean) {
        // Presumed: this is NOT a handler from a remove filter button, but rather from a toggle
        // action on the last initial button panel.  Remove filter button handler is clearActiveFacetChoice().
        var facetCleared: boolean = false;

        for (var i = 0; i < this.activeFacets.length; i++) {
            if (this.activeFacets[i].setID == BioFilterFamilyType.LastNameInitial &&
              facetIDToClear == this.activeFacets[i].ID) {
                this.activeFacets.splice(i, 1);
                facetCleared = true;
                break;
            }
        }
        if (facetCleared) {
            // NOTE: accessibility expert advice is to treat the last name initial collection differently from the other filter menus
            // based on their UI, and so rather than keep them like the others with its arguments to processClearedFilter, instead
            // make use of specialty flas isInFilterMenu and keep the filter family as none
            this.processClearedFilter(focusFirstOnLastInitialMenu, focusFirstOnLastInitialFilterMenu,
              false, -1, BioFilterFamilyType.None, "");
        }
    }

    toggleActiveFacetChoice(facetSetOwningTheToggle: BioFilterFamilyType, chosenFacet: FacetDetail) {
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
            var oneFacet: FacetWithFamily = new FacetWithFamily();
            oneFacet.setID = facetSetOwningTheToggle;
            oneFacet.ID = chosenFacetID;
            oneFacet.value = chosenFacetValue;
            chosenFacet.active = true;
            this.insertIntoProperPlaceNewActiveFacetItem(oneFacet);
            this.processUpdatedFilter(false, false, facetSetOwningTheToggle, chosenFacetValue);
        }
    }

    toggleLastInitialFacet(chosenFacet: FacetDetail, isInFilterMenu: boolean) {
        // If active, then clear it; if not active, make active.
        var itemAlreadyChosen: boolean = false;
        var chosenFacetID: string = chosenFacet.ID;
        var chosenFacetValue: string = chosenFacet.value;

        for (var i = 0; i < this.activeFacets.length; i++) {
            // NOTE: because of other UI settings for "last initial" it is unlikely to be toggled off,
            // instead just set "on" and then turned off via a newly produced button in the UI to do so
            if (this.activeFacets[i].setID == BioFilterFamilyType.LastNameInitial &&
              this.activeFacets[i].ID == chosenFacetID) {
                itemAlreadyChosen = true;
                chosenFacet.active = false;
                this.clearLastInitialFacet(chosenFacetID, !isInFilterMenu, isInFilterMenu);
                break;
            }
        }
        if (!itemAlreadyChosen) {
            var oneFacet: FacetWithFamily = new FacetWithFamily();
            oneFacet.setID = BioFilterFamilyType.LastNameInitial;
            oneFacet.ID = chosenFacetID;
            oneFacet.value = chosenFacetValue;
            chosenFacet.active = true;
            this.insertIntoProperPlaceNewActiveFacetItem(oneFacet);
            // NOTE: accessibility expert advice is to treat the last name initial collection differently from the other filter menus
            // based on their UI, and so rather than keep them like the others with its arguments to processUpdatedFilter, instead
            // make use of specialty flas isInFilterMenu and keep the filter family as none
            this.processUpdatedFilter(!isInFilterMenu, isInFilterMenu, BioFilterFamilyType.None, "");
        }
    }

    filterOnUSMapRegion(chosenUSMapRegionID: string) {
        // If given region is already picked, do nothing.
        // Else, filter on it.  NOTE: this is DIFFERENT behavior from toggleActiveFacetChoice()
        // where selecting something already selected would clear it.
        var itemAlreadyChosen: boolean = false;
        for (var i = 0; i < this.activeFacets.length; i++) {
            if (this.activeFacets[i].setID == BioFilterFamilyType.BirthState &&
              this.activeFacets[i].ID == chosenUSMapRegionID) {
                itemAlreadyChosen = true;
                break;
            }
        }
        if (!itemAlreadyChosen) {
            var oneFacet: FacetWithFamily = new FacetWithFamily();
            oneFacet.setID = BioFilterFamilyType.BirthState;
            oneFacet.ID = chosenUSMapRegionID;
            oneFacet.value = this.globalState.NameForUSState(chosenUSMapRegionID); // e.g., get "Hawaii" from "HI"
            this.insertIntoProperPlaceNewActiveFacetItem(oneFacet);
            this.processUpdatedFilter(false, false, BioFilterFamilyType.BirthState, oneFacet.value);
        }
    }

    clearFilters() {
        this.activeFacets = [];
        this.processUpdatedFilter(false, false, BioFilterFamilyType.None, "");
    }

    setBiographyPageSize() {
        // NOTE: we are using this.myModelledPageSize as model for value being passed in here, with this function
        // called whenever a newly posted (perhaps repeated) value is given for this.myModelledPageSize.
        var needContentsRefresh:boolean = false;
        var newVal:number = this.myModelledPageSize;
        if (newVal > 0) { // only consider positive values
            this.globalState.BiographyPageSize = newVal;
            if (this.myCurrentPageSize != newVal) {
                if (this.myCurrentPageSize < newVal )
                    // If we are to show MORE content, see if we have more to show.
                    needContentsRefresh = (this.totalBiographiesFound > this.myCurrentPageSize);
                else
                    // If we are to show LESS content, see if we have some that will be cropped.
                    needContentsRefresh = (this.totalBiographiesFound >= newVal);
                this.myCurrentPageSize = newVal;
                if (needContentsRefresh)
                    this.routeToPage(1, true); // go to first page of "new" page that changes amount of shown content and force a content update since myCurrentPageSize changed
            }
        }
    }

    setBioSearchSortingAndDoTheSort() {
        // NOTE: this call is tied to the model of this.myCurrentBiographySearchSorting changing.
        // So, pass myCurrentBiographySearchSorting to updateBioSearchSorting:
        if (this.updateBioSearchSorting(this.myCurrentBiographySearchSorting)) // only re-route if sorting setting changes
            this.routeToPage(1, true); // go to first page of "new" page of results and force a page contents update (since this.globalState.BiographySearchSortingPreference
                                       // changed via updateBioSearchSorting right before routeToPage)
    }

    updateBioSearchSorting(newSortingPreference: number): boolean {
        var isLegalChangeInSortSelection: boolean = false;
        // Returns true iff new sorting preference is legal and different from what is currently used.
        if (newSortingPreference >= 0 && newSortingPreference < this.bioSearchSortFields.length) {
            // Legal value.  Check if different.
            if (newSortingPreference != this.globalState.BiographySearchSortingPreference) {
                isLegalChangeInSortSelection = true;
                this.globalState.BiographySearchSortingPreference = newSortingPreference;
            }
        }
        return isLegalChangeInSortSelection;
    }

    appendedCountToValue(givenValue: string, givenCount: number): string {
        return givenValue + ", " + givenCount;
    }

    private processClearedFilter(focusFirstOnLastInitialMenu: boolean, focusFirstOnLastInitialFilterMenu: boolean,
      isClearActionFromRemoveFilterButton: boolean, whichRemoveFilterButtonToFocus: number,
      focusWithinFilterFamily: BioFilterFamilyType, focusValueWithinFilterFamily: string) {
        if (this.activeFacets.length > 0) {
            this.biographySetTitle = "Fetching Filtered Page 1... (in progress)";
            this.screenReaderSummaryTitle = "Maker Directory, Results Pending";

            this.titleManagerService.setTitle(this.screenReaderSummaryTitle);
        }
        else {
            // Special case: note that we have removed the last remaining filter, i.e., we have an empty filter specification.
            this.biographySetTitle = "Fetching Page 1... (in progress)";
            this.screenReaderSummaryTitle = "Maker Directory, Results Pending";

            this.titleManagerService.setTitle(this.screenReaderSummaryTitle);

            // Also, due to the unique nature of the Last Name set of buttons for keyboard-only users,
            // and the fact that this is listed first, be sure that it starts off as collapsed ALWAYS
            // when there are no further "clear filter" (aka "remove filter") buttons above it in
            // the keyboard order.
            this.lastNameOpened = false;
        }
        this.setOptionsAndRouteToPage(true, this.myBornThisTimeFilterFlag, this.myCurrentQuery, 1, this.myCurrentPageSize,
            this.myCurrentSearchLastNameOnlyFlag, this.myCurrentSearchPreferredNameOnlyFlag,
            this.myCurrentBiographySearchSorting, this.specStringFromActiveFacets(),
            focusFirstOnLastInitialMenu, focusFirstOnLastInitialFilterMenu,
            isClearActionFromRemoveFilterButton, whichRemoveFilterButtonToFocus,
            focusWithinFilterFamily, focusValueWithinFilterFamily, false, false);
    }

    private processUpdatedFilter(focusFirstOnLastInitialMenu: boolean, focusFirstOnLastInitialFilterMenu: boolean,
      focusWithinFilterFamily: BioFilterFamilyType, focusValueWithinFilterFamily: string) {
        // Do the filtering by calling the router with an updated spec argument, returning to page 1 of the newly filtered set:
        this.biographySetTitle = "Fetching Filtered Page 1... (in progress)";
        this.screenReaderSummaryTitle = "Maker Directory, Results Pending";

        this.titleManagerService.setTitle(this.screenReaderSummaryTitle);
        // Accumulate routing parameters specifying filter specification, page information, etc.
        this.setOptionsAndRouteToPage(true, this.myBornThisTimeFilterFlag, this.myCurrentQuery, 1, this.myCurrentPageSize,
            this.myCurrentSearchLastNameOnlyFlag, this.myCurrentSearchPreferredNameOnlyFlag, this.myCurrentBiographySearchSorting, this.specStringFromActiveFacets(),
            focusFirstOnLastInitialMenu, focusFirstOnLastInitialFilterMenu, false, -1,
            focusWithinFilterFamily, focusValueWithinFilterFamily, false, false);
    }

    openPickFilterMenu() {
        this.showingFilterMenu = true;
        // NOTE:  To allow bookmarking the shown filter setting immediately, must have a call to setOptionsAndRouteToPage here.
        // That call has been improved to not do extra work (besides adding in a routing parameter that showingFilterMenu is true).
        this.setOptionsAndRouteToPage(false, this.myBornThisTimeFilterFlag, this.myCurrentQuery, this.myCurrentPage, this.myCurrentPageSize,
          this.myCurrentSearchLastNameOnlyFlag, this.myCurrentSearchPreferredNameOnlyFlag,
          this.myCurrentBiographySearchSorting, this.specStringFromActiveFacets(),
          false, false, false, -1, BioFilterFamilyType.None, "", true, false); // 2nd last parm is true to focus on close Filter Menu
    }

    closePickFilterMenu() {
        this.showingFilterMenu = false;
        // With filter menu closed, the possible route argument of menu=1 no longer holds.
        // Reload the route (which because of !this.showingFilterMenu will not have the menu=1 tacked into the route).
        this.setOptionsAndRouteToPage(false, this.myBornThisTimeFilterFlag, this.myCurrentQuery, this.myCurrentPage, this.myCurrentPageSize,
          this.myCurrentSearchLastNameOnlyFlag, this.myCurrentSearchPreferredNameOnlyFlag,
          this.myCurrentBiographySearchSorting, this.specStringFromActiveFacets(),
          false, false, false, -1, BioFilterFamilyType.None, "", false, true); // last parm is true to focus on open Filter Menu
    }

    removeLastInitialLabel(theInitial:string): string {
      var retVal:string = theInitial + ", remove Last Initial filter";
      return retVal;
    }

    toggleLastInitialParent(isInFilterMenu: boolean) {
        this.lastNameOpened = !this.lastNameOpened;
        if (this.lastNameOpened) {
            // if focus is on anything except item 0, remove that focus
            if (this.lastInitialFacets && this.lastInitialFacets.length > 1)
            {
              for (var i = 1; i < this.lastInitialFacets.length; i++)
                if (this.lastInitialFacets[i].focused) {
                  this.lastInitialFacets[i].focused = false;
                }
            }
            // move focus to the first list item as soon as it is posted, via signalFocusMoveToFirstLastInitial
            this.setLastInitialFocusFlags(isInFilterMenu, true);
        }
    }

    setLastInitialFocusFlags(isInFilterMenu: boolean, isTargetingFirstElement: boolean) {
        if (isTargetingFirstElement) {
            this.signalFocusMoveToMenu_LastInitial = false;
            this.signalFocusMoveToFilterMenu_LastInitial = false;
            this.signalFocusMoveToFirstLastInitial = !isInFilterMenu;
            this.signalFocusMoveToFirstLastInitial_FilterMenu = isInFilterMenu;
        }
        else { // targeting the menu itself, rather than the first item in the menu; see how these signals are used elsewhere
            this.signalFocusMoveToMenu_LastInitial = !isInFilterMenu;
            this.signalFocusMoveToFilterMenu_LastInitial = isInFilterMenu;
            this.signalFocusMoveToFirstLastInitial = false;
            this.signalFocusMoveToFirstLastInitial_FilterMenu = false;
        }
    }

    closeLastInitialPanelAndSetFocusToIt(isInFilterMenu: boolean) {
        this.lastNameOpened = false;
        // Set focus to the last initial menu.
        this.setLastInitialFocusFlags(isInFilterMenu, false);
    }

    clearAndResetLastInitialFacet(facetIDToClear: string, isInFilterMenu: boolean) {
        this.lastNameOpened = false; // collapse the panel
        this.clearLastInitialFacet(facetIDToClear, !isInFilterMenu, isInFilterMenu); // clear last name facet and signal last initial panel will get focus
    }
}
