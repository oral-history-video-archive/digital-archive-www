import { Injectable, Inject, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { HttpClient } from '@angular/common/http';

import { SearchResult } from '../storyset/search-result';
import { HistoryMakerService } from '../historymakers/historymaker.service';
import { environment } from '../../environments/environment';
import { GlobalState } from '../app.global-state';

@Injectable()
export class TextSearchService {
    private txtSearchURL = 'StorySearch?query='; // require query argument, so it is already tacked on

    constructor(
      private http: HttpClient, private globalState: GlobalState,
      private historyMakerService: HistoryMakerService) { }

    getTextSearch(query: string, interviewYearFilter: string, parentBiographyForAllStories: number, matchTitleOnly: boolean, matchTranscriptOnly: boolean,
      givenPage: number, givenPageSize: number, genderFacet: string, birthDecadeFacets: string, makerFacets: string, jobFacets: string,
      regionUSStateFacets: string, organizationFacets: string, namedDecadeFacets:string, namedYearFacets: string,
      sortField: string, sortInDescendingOrder: boolean): Observable<SearchResult> {
        var addedArgs: string = "";
        if (parentBiographyForAllStories != this.globalState.NOTHING_CHOSEN)
            addedArgs = addedArgs + "&parentBiographyID=" + parentBiographyForAllStories;
        if (givenPage != null && givenPage > 0)
            addedArgs = addedArgs + "&currentPage=" + givenPage;
        if (givenPageSize != null && givenPageSize > 0)
            addedArgs = addedArgs + "&pageSize=" + givenPageSize;
        if (matchTitleOnly)
            addedArgs = addedArgs + "&searchFields=title";
        else if (matchTranscriptOnly)
            addedArgs = addedArgs + "&searchFields=transcript";
        if (genderFacet != null && genderFacet.length > 0)
            addedArgs = addedArgs + "&genderFacet=" + genderFacet;
        if (birthDecadeFacets != null && birthDecadeFacets.length > 0)
            addedArgs = addedArgs + "&yearFacet=" + birthDecadeFacets;
        if (makerFacets != null && makerFacets.length > 0)
            addedArgs = addedArgs + "&makerFacet=" + makerFacets;
        if (jobFacets != null && jobFacets.length > 0)
            addedArgs = addedArgs + "&jobFacet=" + jobFacets;
        if (regionUSStateFacets != null && regionUSStateFacets.length > 0)
            addedArgs = addedArgs + "&entityStateFacet=" + regionUSStateFacets;
        if (organizationFacets != null && organizationFacets.length > 0)
            addedArgs = addedArgs + "&entityOrgFacet=" + organizationFacets;
        if (namedDecadeFacets != null && namedDecadeFacets.length > 0)
            addedArgs = addedArgs + "&entityDecadeFacet=" + namedDecadeFacets;
        if (namedYearFacets != null && namedYearFacets.length > 0)
            addedArgs = addedArgs + "&entityYearFacet=" + namedYearFacets;

        if (sortField != null && sortField.length > 0) {
            addedArgs = addedArgs + "&sortField=" + sortField;
            // Only bother with sortInDescendingOrder if sortField non-empty.
            if (sortInDescendingOrder != null)
              addedArgs = addedArgs + "&sortInDescendingOrder=" + sortInDescendingOrder;
        }
        // Decide whether interviewYearFilter is valid and non-empty: if so, tack on additional filter arguments
        // interviewYearFilterLowerBound and interviewYearFilterUpperBound
        if (interviewYearFilter != null && interviewYearFilter.length == 9 && interviewYearFilter[4] == "-") {
             // Have xxxx-xxxx as expected.  If each xxxx parses to a number, add in the filter arguments.
            var earlyYear: number = 0;
            var lateYear: number = 0;
            var workString: string = interviewYearFilter.substring(0, 4);
            if (!isNaN(+workString)) {
                earlyYear = +workString;
                workString = interviewYearFilter.substring(5, 9);
                if (!isNaN(+workString)) {
                    lateYear = +workString;
                    addedArgs = addedArgs + "&interviewYearFilterLowerBound=" + earlyYear + "&interviewYearFilterUpperBound=" + lateYear;
                }
            }
        }

        // NOTE: cannot proceed to a text search before first having story search facets all in place.
        return this.historyMakerService.getStoryFacetDetails()
          .flatMap(fd => this.http.get<SearchResult>(environment.serviceBase + this.txtSearchURL + query + addedArgs));
    }
}
