import { Component, OnInit, ViewChild, ElementRef, Pipe, PipeTransform, Inject, Input, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil } from "rxjs/operators";

import { GlobalState } from '../../app.global-state';
import { StorySetType } from '../../storyset/storyset-type';
import { SearchFormService } from './search-form.service';
import { SearchFormOptions } from './search-form-options';

import { SearchFieldListItem } from '../../home/search-field-list-item';

import { StoryAdvancedSearchSettingsManagerService } from '../../story-advanced-search/story-advanced-search-manager.service';
import { environment } from '../../../environments/environment';
import { BaseComponent } from '../base.component';
import { ChosenBioSearchFieldInfo } from "./chosen-bio-search-field-info";
import { UserSettingsManagerService } from '../../user-settings/user-settings-manager.service';

@Component({
    selector: 'search-form',
    templateUrl: './search-form.component.html',
    styleUrls: ['./search-form.component.scss']
})

// NOTE:  this form is used for 3 similar but different types of searches, based on searchOptions settings:
// (a) story search across everyone (this.searchOptions.searchingBiographies is false and this.searchOptions.biographyIDForLimitingSearch == this.globalState.NOTHING_CHOSEN)
// (b) story search within a particular person (with ID of this.searchOptions.biographyIDForLimitingSearch)
// (c) biography search (this.searchOptions.searchingBiographies is true)
// Furthermore, based on accessibility expert advice, the advanced options should always appear before the search button,
// and so story/biography search is optionally decorated with more advanced elements via showAdvancedStoryOptions and
// showAdvancedBioChosenFields respectively.
export class SearchFormComponent extends BaseComponent implements OnInit {
    @ViewChild('queryInput') queryInputArea: ElementRef;

    @Input() showResultsPerPage: boolean = false;       // if true, show results per page UI element to adjust page size (else keep it out of UI)
    @Input() showAdvancedSearchLink: boolean = false;   // if true, show link to advanced search UI element (else keep it out of UI)
    @Input() showAdvancedBioChosenFields: boolean = false; // If true AND this.searchOptions.searchingBiographies is true, show more options for bio search
    @Input() showAdvancedStoryOptions: boolean = false; // If true AND this.searchOptions.searchingBiographies is false, show more options for story search
    @Input() showFieldOptions: boolean = false; // If true then show select UI to choose what field to search into

    searchOptions: SearchFormOptions;
    possibleSearchableBioFields: ChosenBioSearchFieldInfo[];

    private filterByInterviewDate: boolean = false; // toggles via ngModel in associated html view
    private minYearForDateFilter: number = 0;
    private maxYearForDateFilter: number = 0;

    txtQuery: string = ""; // this is the query string as edited by the user
    screenReaderLabel: string = ""; // screen reader description for what this form is all about (search stories or biographies or within 1 biography)
    inputPlaceholder: string = ""; // label for input
    advancedLinkText: string = ""; // label for advanced search

    myModelledPageSize: number;

    searchTitleOnly: boolean;
    searchTranscriptOnly: boolean;
    searchLastNameOnly: boolean;
    searchPreferredNameOnly: boolean;
    searchFieldList: SearchFieldListItem[];
    activeSearchFieldItem: number = -1; // -1 for 'not set yet'
    initialFocusMade: boolean = false; // false for 'not set yet'

    earliestInterviewYear: number;
    latestInterviewYear: number;
    modelledEarliestYear: number;
    modelledLatestYear: number;

    interviewYears: number[];
    minYearAllowed: number;

    constructor(private router: Router,
                private globalState: GlobalState,
                private searchFormService: SearchFormService,
                private userSettingsManagerService:UserSettingsManagerService,
                private storyAdvancedSearchSettingsManagerService: StoryAdvancedSearchSettingsManagerService) {

        super();
        storyAdvancedSearchSettingsManagerService.filterByInterviewDate$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.filterByInterviewDate = value;
        });

        storyAdvancedSearchSettingsManagerService.minYear$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.minYearForDateFilter = value;
        });

        storyAdvancedSearchSettingsManagerService.maxYear$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.maxYearForDateFilter = value;
        });

        // Set default options to current state of things:
        this.searchOptions = searchFormService.currentSearchOptions();
        this.initInterfaceForOptions();

        // NOTE:  it is UNLIKELY that others will change the search options outside of this
        // interface with changes made to the UI in April 2019+, but subscription to changes
        // is left here "just in case."
        searchFormService.searchOptions$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.searchOptions = value;
            this.initInterfaceForOptions();
        });
    }

    private initInterfaceForOptions() {
        // Based on this.searchOptions, set up the interface.
        var listOfSearchFields = [];
        if (this.searchOptions.searchingBiographies) {
            this.searchLastNameOnly = this.globalState.BiographySearchLastNameOnly;
            this.searchPreferredNameOnly = this.globalState.BiographySearchPreferredNameOnly;
            if (this.globalState.BiographySearchLastNameOnly)
                this.activeSearchFieldItem = 1;
            else if (this.globalState.BiographySearchPreferredNameOnly)
                this.activeSearchFieldItem = 2;
            else // search according to a "chosen fields" set
                this.activeSearchFieldItem = 0;
            listOfSearchFields.push(new SearchFieldListItem(0, "Chosen Fields", (this.activeSearchFieldItem == 0)));
            listOfSearchFields.push(new SearchFieldListItem(1, "Last Name", (this.activeSearchFieldItem == 1)));
            listOfSearchFields.push(new SearchFieldListItem(2, "Preferred Name", (this.activeSearchFieldItem == 2)));

            this.inputPlaceholder = "Search Makers:";
            this.advancedLinkText = "Biography Advanced Search";
            this.screenReaderLabel = "Search Biographies";

            // Set the meaning of "Chosen Fields" (with advanced option allowing it to change, too)
            this.AssembleSetOfSearchableBiographyFields(); // this initializes possibleSearchableBioFields
        }
        else {
            this.searchTitleOnly = this.globalState.SearchTitleOnly;
            this.searchTranscriptOnly = this.globalState.SearchTranscriptOnly;
            if (this.globalState.SearchTitleOnly)
                this.activeSearchFieldItem = 1;
            else if (this.globalState.SearchTranscriptOnly)
                this.activeSearchFieldItem = 2;
            else // search both, i.e., "All Fields"
                this.activeSearchFieldItem = 0;
            listOfSearchFields.push(new SearchFieldListItem(0, "All Fields", (this.activeSearchFieldItem == 0)));
            listOfSearchFields.push(new SearchFieldListItem(1, "Title", (this.activeSearchFieldItem == 1)));
            listOfSearchFields.push(new SearchFieldListItem(2, "Transcript", (this.activeSearchFieldItem == 2)));

            if (this.searchOptions.biographyIDForLimitingSearch != this.globalState.NOTHING_CHOSEN) {
                this.inputPlaceholder = "Search this person's stories:";
                this.screenReaderLabel = "Search stories for this person";
            }
            else {
                this.inputPlaceholder = "Search stories:";
                this.screenReaderLabel = "Search Stories";
            }

            this.advancedLinkText = "Story Advanced Search";
        }
        this.searchFieldList = listOfSearchFields;

        // NOTE: advanced search options currently are noted for use in this.searchOptions but do not affect the interface shown within this component
        // (e.g., outside components might be what makes changes to such advanced search options such as an interview date range to filter by)
    }

    ngOnInit() {
        if (this.searchOptions.searchingBiographies)
            this.myModelledPageSize = this.globalState.BiographyPageSize;
        else {
            this.myModelledPageSize = this.globalState.StoryPageSize;
            if (this.showAdvancedStoryOptions) {
                // Also set up min/max year for interview year range for story search.
                this.filterByInterviewDate = this.storyAdvancedSearchSettingsManagerService.currentFilterByInterviewDateSetting();
                this.minYearForDateFilter = this.storyAdvancedSearchSettingsManagerService.currentMinYearForFilterByInterviewDate();
                this.maxYearForDateFilter = this.storyAdvancedSearchSettingsManagerService.currentMaxYearForFilterByInterviewDate();

                this.minYearAllowed = environment.firstInterviewYear;
                var currentYear = new Date().getFullYear();
                this.interviewYears = [];
                for (var i = this.minYearAllowed; i <= currentYear; i++)
                    this.interviewYears.push(i);
                if (this.minYearForDateFilter == 0)
                    this.earliestInterviewYear = this.minYearAllowed;
                else
                    this.earliestInterviewYear = this.minYearForDateFilter;
                this.modelledEarliestYear = this.earliestInterviewYear;
                if (this.maxYearForDateFilter == 0)
                    this.latestInterviewYear = currentYear;
                else
                    this.latestInterviewYear = this.maxYearForDateFilter;
                this.modelledLatestYear = this.latestInterviewYear;
            }
        }
    }

    private AssembleSetOfSearchableBiographyFields() {
        var oneSearchableBioField: ChosenBioSearchFieldInfo;
        var collectedSetOfBioFields: ChosenBioSearchFieldInfo[] = [];

        oneSearchableBioField = new ChosenBioSearchFieldInfo(0, "Accession", false);
        collectedSetOfBioFields.push(oneSearchableBioField);
        oneSearchableBioField = new ChosenBioSearchFieldInfo(1, "Biography", false);
        collectedSetOfBioFields.push(oneSearchableBioField);
        oneSearchableBioField = new ChosenBioSearchFieldInfo(2, "Description", false);
        collectedSetOfBioFields.push(oneSearchableBioField);
        oneSearchableBioField = new ChosenBioSearchFieldInfo(3, "First Name", false);
        collectedSetOfBioFields.push(oneSearchableBioField);
        oneSearchableBioField = new ChosenBioSearchFieldInfo(4, "Last Name", false);
        collectedSetOfBioFields.push(oneSearchableBioField);
        oneSearchableBioField = new ChosenBioSearchFieldInfo(5, "Preferred Name", false);
        collectedSetOfBioFields.push(oneSearchableBioField);
        this.possibleSearchableBioFields = collectedSetOfBioFields;
        var bioSearchFieldsMask = this.userSettingsManagerService.currentBioSearchFieldsMask();
        this.refreshUIStateToMatchMask(bioSearchFieldsMask);
    }

    refreshUIStateToMatchMask(bioSearchFieldsMask: number) {
        if (bioSearchFieldsMask & this.globalState.BiographySearchAccession_On)
            this.possibleSearchableBioFields[0].selected = true;
        else
            this.possibleSearchableBioFields[0].selected = false;
        if (bioSearchFieldsMask & this.globalState.BiographySearchBiographyShort_On)
            this.possibleSearchableBioFields[1].selected = true;
        else
            this.possibleSearchableBioFields[1].selected = false;
        if (bioSearchFieldsMask & this.globalState.BiographySearchDescriptionShort_On)
            this.possibleSearchableBioFields[2].selected = true;
        else
            this.possibleSearchableBioFields[2].selected = false;
        if (bioSearchFieldsMask & this.globalState.BiographySearchFirstName_On)
            this.possibleSearchableBioFields[3].selected = true;
        else
            this.possibleSearchableBioFields[3].selected = false;
        if (bioSearchFieldsMask & this.globalState.BiographySearchLastName_On)
            this.possibleSearchableBioFields[4].selected = true;
        else
            this.possibleSearchableBioFields[4].selected = false;
        if (bioSearchFieldsMask & this.globalState.BiographySearchPreferredName_On)
            this.possibleSearchableBioFields[5].selected = true;
        else
            this.possibleSearchableBioFields[5].selected = false;
    }

    onSearchableBioFieldChange(id: number, label: string, isChecked: boolean) {
        var bitFieldOperand: number;
        // NOTE: The mapping between bitmap mask and id is established in AssembleSetOfSearchableBiographyFields().
        // TODO: Named constants could be used for the [0,6] values in these two calls once the code stabilizes.
        switch (id) {
            case 0:
                bitFieldOperand = this.globalState.BiographySearchAccession_On;
                break;
            case 1:
                bitFieldOperand = this.globalState.BiographySearchBiographyShort_On;
                break;
            case 2:
                bitFieldOperand = this.globalState.BiographySearchDescriptionShort_On;
                break;
            case 3:
                bitFieldOperand = this.globalState.BiographySearchFirstName_On;
                break;
            case 4:
                bitFieldOperand = this.globalState.BiographySearchLastName_On;
                break;
            case 5:
                bitFieldOperand = this.globalState.BiographySearchPreferredName_On;
                break;
        }
        var bioSearchFieldsMask = this.userSettingsManagerService.currentBioSearchFieldsMask();
        if (isChecked) {
            // If bit is not already on to mark the field as in the default chosen fields set, do so now.
            if ((bioSearchFieldsMask & bitFieldOperand) == 0)
                this.userSettingsManagerService.updateBioSearchFieldsMask(bioSearchFieldsMask + bitFieldOperand);
        }
        else {
            // If bit is not already cleared to mark the field as NOT in the default chosen fields set, do so now.
            if ((bioSearchFieldsMask | bitFieldOperand) != 0)
                this.userSettingsManagerService.updateBioSearchFieldsMask(bioSearchFieldsMask - bitFieldOperand);
        }
    }

    doResetBioFieldsToDefault() {
        var bioSearchFieldsMask:number = this.userSettingsManagerService.defaultBioSearchFieldsMask();
        this.userSettingsManagerService.updateBioSearchFieldsMask(bioSearchFieldsMask);
        this.refreshUIStateToMatchMask(bioSearchFieldsMask);
    }

    setSearchFieldSpecification() {
        // relates to setSearchFieldOptions and contents of searchFieldList, of course, with this.searchOptions as a gate
        // uses this.activeSearchFieldItem to set up search field specification
        if (this.searchOptions.searchingBiographies) { // biography search
            if (this.activeSearchFieldItem == 1) {
                this.searchLastNameOnly = true;
                this.searchPreferredNameOnly = false;
            }
            else if (this.activeSearchFieldItem == 2) {
                this.searchLastNameOnly = false;
                this.searchPreferredNameOnly = true;
            }
            else { // this.activeSearchFieldItem == 0 for "Chosen Fields" picked, so do not limit search to just one field or the other
                this.searchLastNameOnly = false;
                this.searchPreferredNameOnly = false;
            }
            this.globalState.BiographySearchLastNameOnly = this.searchLastNameOnly;
            this.globalState.BiographySearchPreferredNameOnly = this.searchPreferredNameOnly;
        }
        else { // story search
            if (this.activeSearchFieldItem == 1) {
                this.searchTitleOnly = true;
                this.searchTranscriptOnly = false;
            }
            else if (this.activeSearchFieldItem == 2) {
                this.searchTitleOnly = false;
                this.searchTranscriptOnly = true;
            }
            else { // this.activeSearchFieldItem == 0 for "All Fields" picked, so do not limit search to just one field or the other
                this.searchTitleOnly = false;
                this.searchTranscriptOnly = false;
            }
            this.globalState.SearchTitleOnly = this.searchTitleOnly;
            this.globalState.SearchTranscriptOnly = this.searchTranscriptOnly;
        }
    }

    doSearch() {
        // Accumulate routing parameters specifying filter specification, page information, etc.
        if (this.txtQuery != null && this.txtQuery.length > 0) {

            // Non-empty query, so proceed with a "do search" action dependent on this.searchOptions.
            var moreOptions = [];

            moreOptions['q'] = this.globalState.cleanedQueryRouterParameter(this.txtQuery);

            // IMPORTANT:  use tracking for this search query (so set a 'ut' parameter in the route to flag it for tracking/logging)
            moreOptions['ut'] = "1";

            moreOptions['pg'] = 1; // always show page 1 of new query

            if (this.searchOptions.searchingBiographies) { // biography search
                moreOptions['pgS'] = this.globalState.BiographyPageSize; // use global context biography page size
                this.globalState.BiographySearchLastNameOnly = this.searchLastNameOnly;
                this.globalState.BiographySearchPreferredNameOnly = this.searchPreferredNameOnly;

                if (this.searchLastNameOnly)
                    moreOptions['ln'] = "1"; // search just the last name field
                else
                    moreOptions['ln'] = "0";
                if (this.searchPreferredNameOnly)
                    moreOptions['pn'] = "1"; // search just the preferred name field
                else
                    moreOptions['pn'] = "0";

                this.router.navigate(['/all', moreOptions]);

            }
            else { // story search
                moreOptions['pgS'] = this.globalState.StoryPageSize; // use global context story page size
                this.globalState.SearchTitleOnly = this.searchTitleOnly;
                this.globalState.SearchTranscriptOnly = this.searchTranscriptOnly;

                if (this.searchTitleOnly) // use explicit "search-title-only" indicator of sT if true
                    moreOptions['sT'] = "1";
                else if (this.searchTranscriptOnly) // use explicit "search-transcript-only" indicator of sS (search spoken) if true
                    moreOptions['sS'] = "1";
                // else default to "both" without the use of an explicit flag

                if ((this.searchOptions.biographyIDForLimitingSearch != this.globalState.NOTHING_CHOSEN))
                {
                    moreOptions['ip'] = this.searchOptions.biographyIDForLimitingSearch; // flag that an "inside THIS person" search context will be set and used
                    moreOptions['ia'] = this.searchOptions.biographyAccessionID;
                }

                if (this.searchOptions.allowAdvancedStorySearchSettings) {
                    var filterByInterviewDate: boolean = this.storyAdvancedSearchSettingsManagerService.currentFilterByInterviewDateSetting();
                    if (filterByInterviewDate) {
                        // Check advanced story search settings and tack on additional qualifications to moreOptions as needed.
                        // NOTE: if date range is "backward" as in end < start, go ahead and correct it using the advanced story search options service, too.
                        var minYear: number = this.storyAdvancedSearchSettingsManagerService.currentMinYearForFilterByInterviewDate();
                        var maxYear: number = this.storyAdvancedSearchSettingsManagerService.currentMaxYearForFilterByInterviewDate();
                        var currentYear = new Date().getFullYear();
                        // Quick check that a filter is in existence, i.e., the choice is not [min, max] which is the same as no filter at all
                        if ((minYear != 0 || maxYear != 0) && (minYear > environment.firstInterviewYear || maxYear < currentYear)) {
                            // A filter not equal to (0, 0) or [min, max] is given.  Pass it in the route.
                            // One last fix: if user put in max, min rather than min, max, do the fix here and in this.globalState tracking variables.
                            var minForRange: number = minYear;
                            var maxForRange: number = maxYear;
                            if (minYear > maxYear) {
                                minForRange = maxYear;
                                this.storyAdvancedSearchSettingsManagerService.updateMinYearForFilterByInterviewDate(minForRange);
                                maxForRange = minYear;
                                this.storyAdvancedSearchSettingsManagerService.updateMaxYearForFilterByInterviewDate(maxForRange);
                            }
                            if (minForRange == 0)
                                minForRange = environment.firstInterviewYear;
                            if (maxForRange == 0)
                                maxForRange = currentYear;
                            moreOptions['iy'] = minForRange + "-" + maxForRange;
                        }
                    }
                }
                this.router.navigate(['/stories', StorySetType.TextSearch, moreOptions]);
            }

            this.txtQuery = "";
          }
    }

    setResultsPageSize() {
        if (this.searchOptions.searchingBiographies)
            this.globalState.BiographyPageSize = this.myModelledPageSize;
        else
            this.globalState.StoryPageSize = this.myModelledPageSize;
    }

    setFocusToQueryInput() {
        // Set the focus to the query input area.
        // NOTE: this technique is discussed here: https://codeburst.io/focusing-on-form-elements-the-angular-way-e9a78725c04f

        if (this.queryInputArea && this.queryInputArea.nativeElement)
        {
            if (!this.initialFocusMade) {
                this.initialFocusMade = true; // extra "guard" needed March 2020 to allow tab navigation in this component
                this.queryInputArea.nativeElement.focus();
            }
        }
    }

    routeToAdvancedSearch() {
        if (this.searchOptions.searchingBiographies) { // route to advanced biography search
            this.router.navigate(['/bioadvs']);
        }
        else { // route to advanced story search (one of two types, inside person or across all)
            var moreOptions = [];

            if (this.searchOptions.biographyIDForLimitingSearch != this.globalState.NOTHING_CHOSEN) {
                moreOptions['ip'] = this.searchOptions.biographyIDForLimitingSearch; // flag that an "inside THIS person" search context will be set and used
                moreOptions['ia'] = this.searchOptions.biographyAccessionID;
            }
            this.router.navigate(['/storyadvs', moreOptions]);
        }
    }

    setMinInterviewYear() {
        // If the model, modelledEarliestYear, changes from what we know (this.earliestInterviewYear), call setInterviewYearBound.
        if (this.earliestInterviewYear != this.modelledEarliestYear)
            this.setInterviewYearBound(this.modelledEarliestYear, true);
    }

    setMaxInterviewYear() {
        // If the model, modelledLatestYear, changes from what we know (this.latestInterviewYear), call setInterviewYearBound.
        if (this.latestInterviewYear != this.modelledLatestYear)
            this.setInterviewYearBound(this.modelledLatestYear, false);
    }

    setInterviewYearBound(newBound: number, setTheLowerBound: boolean) {
        if (setTheLowerBound) {
            this.earliestInterviewYear = newBound;
            this.minYearForDateFilter = newBound;
            this.storyAdvancedSearchSettingsManagerService.updateMinYearForFilterByInterviewDate(newBound);
        }
        else {
            this.latestInterviewYear = newBound;
            this.maxYearForDateFilter = newBound;
            this.storyAdvancedSearchSettingsManagerService.updateMaxYearForFilterByInterviewDate(newBound);
        }
    }

    updatedFilterSetting(isChecked: boolean) {
        // NOTE: this is tied to html (ngModelChange) where the model is this.filterByInterviewDate, which changed to newValue.
        // Just make that change persistent via storyAdvancedSearchSettingsManagerService:
        this.storyAdvancedSearchSettingsManagerService.updateFilterByInterviewDateSetting(isChecked); // note, via service, the updated setting
    }
}
