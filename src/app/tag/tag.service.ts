import { Injectable, Inject, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { HttpClient } from '@angular/common/http';

import { TagTree } from './tag-tree';

import { SearchResult } from '../storyset/search-result';
import { TagSearchResult } from './tag-search-result';

import { HistoryMakerService } from '../historymakers/historymaker.service';
import { environment } from '../../environments/environment';

@Injectable()
export class TagService {
    private tagListURL = 'TagList';
    private tagSearchCountURL = 'TagSearchCount?csvTagList='; // require csvTagList. so it is already tacked on
    private tagSearchURL = 'TagSearch?csvTagList='; // require csvTagList. so it is already tacked on

    // NOTE:  Tag tree structure assumed to be very stable and hence will be cached.
    private cachedTagTree: TagTree;
    // NOTE:  Tag tree has branches with UNIQUE identifiers: push this data into a cached dictionary.
    private tagMap: { [key: string]: string } = {};

    constructor(private http: HttpClient, private historyMakerService: HistoryMakerService) {
        this.cachedTagTree = null;
    }

    getTags(): Observable<TagTree> {
        if (this.cachedTagTree != null)
            return Observable.of(this.cachedTagTree);
        else {
            return this.http.get<TagTree>(environment.serviceBase + this.tagListURL)
            .do(givenTagTree => {
              this.cachedTagTree = givenTagTree;
              var j: number;
              for (var i = 0; i < this.cachedTagTree.branches.length; i++) {
                  for (j = 0; j < this.cachedTagTree.branches[i].branchValues.length; j++) {
                      this.tagMap[this.cachedTagTree.branches[i].branchValues[j].id] = this.cachedTagTree.branches[i].branchValues[j].label;
                  }
              }
            });
        }
    }

    getTagSearch(csvTagList: string, givenPage: number, givenPageSize: number, genderFacet: string, birthDecadeFacets: string,
        makerFacets: string, jobFacets: string, regionUSStateFacets: string, organizationFacets: string, namedDecadeFacets: string, namedYearFacets: string,
        sortField: string, sortInDescendingOrder: boolean): Observable<SearchResult> {
        var addedArgs: string = "";

        if (givenPage != null && givenPage > 0)
            addedArgs = addedArgs + "&currentPage=" + givenPage;
        if (givenPageSize != null && givenPageSize > 0)
            addedArgs = addedArgs + "&pageSize=" + givenPageSize;
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

        // NOTE: cannot proceed to a tag search (story-focused) before first having story search facets all in place.
        return this.historyMakerService.getStoryFacetDetails()
          .flatMap(fd => this.http.get<SearchResult>(environment.serviceBase + this.tagSearchURL + csvTagList + addedArgs));
    }

    getTagSearchCount(csvTagList: string): Observable<number> {
        if (csvTagList == null || csvTagList.length == 0)
            return Observable.of(0);
        else {
            return this.http.get<TagSearchResult>(environment.serviceBase + this.tagSearchCountURL + csvTagList)
              .map(tagResult => {
                var storyResultCount: number = 0; // use 0 for ill-defined results
                if (tagResult != null)
                    storyResultCount = tagResult.count;
                return storyResultCount;
              });
        }
    }

    getTagNames(csvIDList:string): string {
        var IDs: string[] = csvIDList.split(",");
        // NOTE: If IDs are empty, or are not in the cached tags, an empty string is returned.
        if (IDs == null || IDs.length == 0 || this.cachedTagTree == null)
            return "";
        else {
            // NOTE:  assumes non-null value for this.tagMap
            var orderedIDs: string[] = IDs.sort();
            var gatheredNames: string = "";
            var oneTagName: string;
            var chosenTagName: string[] = [];

            for (var i = 0; i < orderedIDs.length; i++) {
                oneTagName = this.tagMap[orderedIDs[i]];
                if (oneTagName != null && oneTagName.length > 0)
                    chosenTagName.push(oneTagName);
            }
            if (chosenTagName.length > 0) {
                gatheredNames = chosenTagName[0];
                for (var i = 1; i < chosenTagName.length; i++) {
                    gatheredNames += ", " + chosenTagName[i]; // separate each entry with ', '
                }
            }
            return gatheredNames;
        }
    }
}
