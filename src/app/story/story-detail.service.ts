import { Injectable, Inject, OnInit } from '@angular/core';
import { Observable } from "rxjs/Observable";
import { HttpClient } from '@angular/common/http';

import { DetailedStory } from './detailed-story';
import { environment } from '../../environments/environment';

@Injectable()
export class StoryDetailService {
    private storyDetailsURL = 'StoryDetails?storyID=';
    private storyDetailsQueryTermsArgument = '&queryTerms=';
    private readonly WILDCARD_TO_MATCH_ALL = "*";

    constructor(private http: HttpClient) { }

    getStorySpecifics(ID: number, queryTerms: string): Observable<DetailedStory> {
        // NOTE: If ID not found in the data set, then null is returned to caller
        var serviceURL: string = environment.serviceBase + this.storyDetailsURL + ID;

        // TODO: (!!!TBD!!!): Perhaps add in another argument to optionally limit the length of the timing pairs array returned in this call.
        // (Currently the service decides whether to truncate timing pairs.)

        // NOTE: if query terms are just the wildcard to match everything, as in "*", then do not return matches to every single word:  too confusing to users.
        if (queryTerms != null && queryTerms.length > 0 && queryTerms.trim() != this.WILDCARD_TO_MATCH_ALL)
            serviceURL += this.storyDetailsQueryTermsArgument + queryTerms;

        return this.http.get<DetailedStory>(serviceURL);
    }
}
