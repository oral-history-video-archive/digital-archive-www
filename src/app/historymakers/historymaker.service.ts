import { Injectable, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from "rxjs/Rx";

import { TableOfContents } from './table-of-contents';
import { FacetDetail } from './facet-detail';

import { CorpusSpecifics } from './corpus-specifics';

import { BiographySearchFacetsDetails, StorySearchFacetsDetails } from './search-facets-details';

import { environment } from '../../environments/environment';
import { GlobalState } from '../app.global-state';

@Injectable()
export class HistoryMakerService {
    private corpusSpecificsURL = 'CorpusInfo';
    private peopleURL = 'BiographySearch';
    private peopleBornThisDayURL = 'PeopleBornThisDay';
    // not used, private peopleBornThisWeekURL = 'PeopleBornThisWeek';
    private biographySearchFacetsURL = 'BiographyFacets';
    private storySearchFacetsURL = 'StoryFacets';

    // NOTE:  Caching the string labels for numeric IDs used for Maker and OccupationTypes via an api/facetList call:
    private cachedBiographyFacetDetails: BiographySearchFacetsDetails = null;
    private cachedStoryFacetDetails: StorySearchFacetsDetails = null;
    private cachedMakerCategories = new Map<string, string>();
    private cachedOccupationTypes = new Map<string, string>();
    private cachedOrganizationNames = new Map<string, string>();
    private cachedCorpusSpecifics: CorpusSpecifics = null;

    constructor( private http: HttpClient,
      private globalState: GlobalState) {}

    private storeCorpusSpecifics(givenSpecifics: CorpusSpecifics) {
        if (this.cachedCorpusSpecifics != null)
            return; // details already in cache

        this.cachedCorpusSpecifics = givenSpecifics;
    }

    private storeBiographyFacetDetails(givenDetails: BiographySearchFacetsDetails) {
        if (this.cachedBiographyFacetDetails != null)
            return; // details already in cache

        this.cachedBiographyFacetDetails = givenDetails;
        for (var i: number = 0; i < this.cachedBiographyFacetDetails.makerCategories.length; i++) {
            this.cachedMakerCategories.set(this.cachedBiographyFacetDetails.makerCategories[i].id,
              this.cachedBiographyFacetDetails.makerCategories[i].label);
        }
        for (var j: number = 0; j < this.cachedBiographyFacetDetails.occupationTypes.length; j++) {
            this.cachedOccupationTypes.set(this.cachedBiographyFacetDetails.occupationTypes[j].id,
              this.cachedBiographyFacetDetails.occupationTypes[j].label);
        }
    }

    private storeStoryFacetDetails(givenDetails: StorySearchFacetsDetails) {
        if (this.cachedStoryFacetDetails != null)
            return; // details already in cache

        this.cachedStoryFacetDetails = givenDetails;

        var alsoCopyIntoCachedBiographyFacetDetails: boolean = BiographySearchFacetsDetails.IS_FULLY_WITHIN_STORY_FACETS;
        if (alsoCopyIntoCachedBiographyFacetDetails && (this.cachedBiographyFacetDetails == null)) {
            // Assign a non-null into this.cachedBiographyFacetDetails, but NOTE that this assumes the real data is in this.cachedOccupationTypes and this.cachedMakerCategories.
            // So, this.cachedBiographyFacetDetails is made non-null but also not filled in.
            this.cachedBiographyFacetDetails = new BiographySearchFacetsDetails();
            this.cachedBiographyFacetDetails.makerCategories = [];
            this.cachedBiographyFacetDetails.occupationTypes = [];
        }
        // else don't mess with cachedBiographyFacetDetails if it is not wholly consumed by cachedStoryFacetDetails.

        if (this.cachedMakerCategories.size == 0) {
            for (var i: number = 0; i < this.cachedStoryFacetDetails.makerCategories.length; i++) {
              this.cachedMakerCategories.set(this.cachedStoryFacetDetails.makerCategories[i].id,
                this.cachedStoryFacetDetails.makerCategories[i].label);
            }
        }
        if (this.cachedOccupationTypes.size == 0) {
            for (var j: number = 0; j < this.cachedStoryFacetDetails.occupationTypes.length; j++) {
              this.cachedOccupationTypes.set(this.cachedStoryFacetDetails.occupationTypes[j].id,
                this.cachedStoryFacetDetails.occupationTypes[j].label);
            }
        }
        // Always load up this.cachedOrganizationNames when this.cachedStoryFacetDetails is first set.
        this.cachedOrganizationNames.clear();
        for (var j: number = 0; j < this.cachedStoryFacetDetails.entityOrganizations.length; j++) {
            this.cachedOrganizationNames.set(this.cachedStoryFacetDetails.entityOrganizations[j].id,
              this.cachedStoryFacetDetails.entityOrganizations[j].label);
        }
    }

    getBiographyFacetDetails(): Observable<BiographySearchFacetsDetails> {
        if (this.cachedBiographyFacetDetails != null)
            return Observable.of(this.cachedBiographyFacetDetails);
        else {
            return this.http.get<BiographySearchFacetsDetails>(environment.serviceBase + this.biographySearchFacetsURL)
                    .do(fd => this.storeBiographyFacetDetails(fd));
        }
    }

    getStoryFacetDetails(): Observable<StorySearchFacetsDetails> {
        if (this.cachedStoryFacetDetails != null)
            return Observable.of(this.cachedStoryFacetDetails);
        else {
            return this.http.get<StorySearchFacetsDetails>(environment.serviceBase + this.storySearchFacetsURL)
                    .do(fd => this.storeStoryFacetDetails(fd));
        }
    }

    getCorpusSpecifics(): Observable<CorpusSpecifics> {
        if (this.cachedCorpusSpecifics != null)
            return Observable.of(this.cachedCorpusSpecifics);
        else {
            // NOTE: using advice from
            // https://stackoverflow.com/questions/40788163/how-to-make-nested-observable-calls-in-angular2
            return this.getBiographyFacetDetails()
              .flatMap(fd => this.http.get<CorpusSpecifics>(environment.serviceBase + this.corpusSpecificsURL)
                .do(cs => this.storeCorpusSpecifics(cs)));
        }
    }

    getHistoryMakersBornThisDay(givenPage: number, givenPageSize: number,
      genderFacet: string, birthDecadeFacet: string, makerFacets: string, jobFacets: string,
      lastInitialFacetSpec: string, regionUSStateFacetSpec: string): Observable<TableOfContents> {
        var addedArgs: string = "";
        if (givenPage != null && givenPage > 0)
            addedArgs = addedArgs + "&currentPage=" + givenPage;
        if (givenPageSize != null && givenPageSize > 0)
            addedArgs = addedArgs + "&pageSize=" + givenPageSize;
        if (genderFacet != null && genderFacet.length > 0)
            addedArgs = addedArgs + "&genderFacet=" + genderFacet;
        if (birthDecadeFacet != null && birthDecadeFacet.length > 0)
            addedArgs = addedArgs + "&yearFacet=" + birthDecadeFacet;
        if (makerFacets != null && makerFacets.length > 0)
            addedArgs = addedArgs + "&makerFacet=" + makerFacets;
        if (jobFacets != null && jobFacets.length > 0)
            addedArgs = addedArgs + "&jobFacet=" + jobFacets;
        if (lastInitialFacetSpec != null && lastInitialFacetSpec.length > 0)
            addedArgs = addedArgs + "&lastInitialFacet=" + lastInitialFacetSpec;
        if (regionUSStateFacetSpec != null && regionUSStateFacetSpec.length > 0)
            addedArgs = addedArgs + "&stateFacet=" + regionUSStateFacetSpec;

        // NOTE:  always pass in "this day" from the client perspective, as an additional argument to the service:
        var dateNow = new Date();
        // Remember to map months from [0,11] to [1,12] range; date is fine as is.
        var dateAsYYYYMD = dateNow.getFullYear() + "-" + (dateNow.getMonth() + 1) + "-" + dateNow.getDate();
        addedArgs = addedArgs + "&dateTodayFacet=" + dateAsYYYYMD;

        // Replace opening & with ? character instead (since there always are contents in addedArgs, at least the dateTodayFacet argument).
        addedArgs = "?" + addedArgs.substring(1);

        return this.getBiographyFacetDetails()
          .flatMap(fd => this.http.get<TableOfContents>(environment.serviceBase + this.peopleBornThisDayURL + addedArgs));
    }

    getHistoryMakers(givenQuery: string, givenSearchFieldsMask: number,
      searchJustLastNameFieldFlag: boolean, searchJustPreferredFieldFlag: boolean,
      givenPage: number, givenPageSize: number, genderFacet: string, birthDecadeFacet: string, makerFacets: string,
      jobFacets: string, lastInitialFacet: string, regionUSStateFacetSpec: string, sortField: string, sortInDescendingOrder: boolean): Observable<TableOfContents> {

        var addedArgs: string = "";
        var queryArg: string;
        var queryIssued: boolean = false;

        // NOTE: To accommodate consistent analytics reporting, move the query argument to the front.
        // (Later processing likely will only issue an analytics event if there is a query string.)
        if (givenQuery == null || givenQuery.length == 0)
            queryArg = "query=*";
        else {
            queryArg = "query=" + givenQuery;
            queryIssued = true;
        }

        if (givenPage != null && givenPage > 0)
            addedArgs = addedArgs + "&currentPage=" + givenPage;
        if (givenPageSize != null && givenPageSize > 0)
            addedArgs = addedArgs + "&pageSize=" + givenPageSize;
        if (genderFacet != null && genderFacet.length > 0)
            addedArgs = addedArgs + "&genderFacet=" + genderFacet;
        if (birthDecadeFacet != null && birthDecadeFacet.length > 0)
            addedArgs = addedArgs + "&yearFacet=" + birthDecadeFacet;
        if (makerFacets != null && makerFacets.length > 0)
            addedArgs = addedArgs + "&makerFacet=" + makerFacets;
        if (jobFacets != null && jobFacets.length > 0)
            addedArgs = addedArgs + "&jobFacet=" + jobFacets;
        if (lastInitialFacet != null && lastInitialFacet.length > 0)
            addedArgs = addedArgs + "&lastInitialFacet=" + lastInitialFacet;
        if (regionUSStateFacetSpec != null && regionUSStateFacetSpec.length > 0)
            addedArgs = addedArgs + "&stateFacet=" + regionUSStateFacetSpec;

        // NOTE: currently we are always specifying the search fields, even if both searchJustLastNameFieldFlag and searchJustPreferredFieldFlag are false.
        addedArgs = addedArgs + "&searchFields=" + this.searchFieldsForBiographySearch(givenSearchFieldsMask, searchJustLastNameFieldFlag, searchJustPreferredFieldFlag);
        if (sortField != null && sortField.length > 0) {
            addedArgs = addedArgs + "&sortField=" + sortField;
            // Only bother with sortInDescendingOrder if sortField non-empty.
            if (sortInDescendingOrder != null)
              addedArgs = addedArgs + "&sortInDescendingOrder=" + sortInDescendingOrder;
        }
        // NOTE: addedArgs could have stayed empty ("").

        return this.getBiographyFacetDetails()
          .flatMap(fd => this.http.get<TableOfContents>(environment.serviceBase + this.peopleURL + "?" + queryArg + addedArgs));
    }

    private searchFieldsForBiographySearch(givenSearchFieldsMask: number, justLastName: boolean, justPreferredName: boolean): string {
        var csvFieldsToSearch: string = "";

        if (justLastName)
            csvFieldsToSearch = "lastName";
        else if (justPreferredName)
            csvFieldsToSearch = "preferredName";
        else { // note the use of bit-operator & (NOT a logical && but just &) to and the mask to the various bit settings in the statements below
            if ((givenSearchFieldsMask & this.globalState.BiographySearchAccession_On) != 0)
                csvFieldsToSearch += "accession,";
            if ((givenSearchFieldsMask & this.globalState.BiographySearchDescriptionShort_On) != 0)
                csvFieldsToSearch += "descriptionShort,";
            if ((givenSearchFieldsMask & this.globalState.BiographySearchBiographyShort_On) != 0)
                csvFieldsToSearch += "biographyShort,";
            if ((givenSearchFieldsMask & this.globalState.BiographySearchFirstName_On) != 0)
                csvFieldsToSearch += "firstName,";
            if ((givenSearchFieldsMask & this.globalState.BiographySearchLastName_On) != 0)
                csvFieldsToSearch += "lastName,";
            if ((givenSearchFieldsMask & this.globalState.BiographySearchPreferredName_On) != 0)
                csvFieldsToSearch += "preferredName,";
            if (csvFieldsToSearch.length > 0)
                csvFieldsToSearch = csvFieldsToSearch.substr(0, csvFieldsToSearch.length - 1); // take off spurious , at end
            else // NOTE: never allow no fields to be chosen.  Default to just last name
                csvFieldsToSearch = "lastName";
        }
        return csvFieldsToSearch;
    }

    getJobFamilyList(chosenJobs: string[]): Observable<string> {
      if (chosenJobs == null || chosenJobs.length == 0)
        return Observable.of("");
      else
        // NOTE: cannot proceed to getting the job family list corresponding to numerals before first having search facets all in place.
        return this.getBiographyFacetDetails()
          .map(fd => {
              // NOTE: If chosenJobs are empty, or are not in the OccupationTypes table, an empty string is returned.
              var gatheredNames: string = "";
              if (this.cachedOccupationTypes != null) {
                  for (var i = 0; i < chosenJobs.length; i++) {
                      if (this.cachedOccupationTypes.has(chosenJobs[i]))
                          gatheredNames += this.cachedOccupationTypes.get(chosenJobs[i]) + "; "; // separate each entry with '; '
                  }
              }
              if (gatheredNames.length > 0)
                  gatheredNames = gatheredNames.substring(0, gatheredNames.length - 2); // truncate extra "; " at end
              return gatheredNames;
          });
    }

    getMakerGroupList(chosenMakers: string[]) : Observable<string> {
      if (chosenMakers == null || chosenMakers.length == 0)
        return Observable.of("");
      else
         // NOTE: cannot proceed to getting the maker group corresponding to numerals before first having search facets all in place.
         return this.getBiographyFacetDetails()
          .map(fd => {
              // NOTE: If chosenMakers are empty, or are not in the MakerCategories table, an empty string is returned.
              var gatheredNames: string = "";
              if (this.cachedMakerCategories != null) {
                  for (var i = 0; i < chosenMakers.length; i++) {
                      if (this.cachedMakerCategories.has(chosenMakers[i]))
                          gatheredNames += this.cachedMakerCategories.get(chosenMakers[i]) + ", "; // separate each entry with ', '
                  }
              }
              if (gatheredNames.length > 0)
                  gatheredNames = gatheredNames.substring(0, gatheredNames.length - 2); // truncate extra ", " at end
              return gatheredNames;
          });
    }

    getJobType(chosenJobType: string): string {
        var retVal: string = "";
        if (this.cachedOccupationTypes && this.cachedOccupationTypes.has(chosenJobType))
            retVal = this.cachedOccupationTypes.get(chosenJobType);
        return retVal;
    }

    getMaker(chosenMaker: string): string {
        var retVal: string = "";
        if (this.cachedMakerCategories && this.cachedMakerCategories.has(chosenMaker))
            retVal = this.cachedMakerCategories.get(chosenMaker);
        return retVal;
    }

    getOrganizationName(chosenOrganization: string): string {
        var retVal: string = "";
        if (this.cachedOrganizationNames && this.cachedOrganizationNames.has(chosenOrganization))
            retVal = this.cachedOrganizationNames.get(chosenOrganization);
        return retVal;
    }

}
