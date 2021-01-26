import { Component, OnInit, ViewChild, AfterViewChecked } from '@angular/core';
import { takeUntil } from "rxjs/operators";

import { ActivatedRoute, Params } from '@angular/router';

import { TitleManagerService } from '../shared/title-manager.service';
import { GlobalState } from '../app.global-state';
import { SearchFormService } from '../shared/search-form/search-form.service';
import { SearchFormOptions } from '../shared/search-form/search-form-options';
import { SearchFormComponent } from '../shared/search-form/search-form.component';
import { BiographyStorySetService } from '../biography-storyset/biography-storyset.service';

import { HistoryMakerService } from '../historymakers/historymaker.service'; // needed for corpus details

import { BaseComponent } from '../shared/base.component';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title

@Component({
    selector: 'thda-search-simple',
    templateUrl: './search-simple.component.html',
    styleUrls: ['./search-simple.component.scss']
})
export class SearchSimpleComponent extends BaseComponent implements OnInit, AfterViewChecked {
    @ViewChild('mySearchForm') mySearchFormElement: SearchFormComponent;

    simpleSearchPageTitle: string;
    simpleSearchPageTitleLong: string;
    signalFocusToTitle: boolean = false; // is used in html rendering of this component

    private limitingBiographyAccession: string;
    private limitingBiographyPreferredName: string;

    private tailoredStorySearchMessage: string = "Search Stories";
    private tailoredBioSearchMessage: string = "Search Makers";

    constructor(private route: ActivatedRoute,
      private globalState: GlobalState,
      private historyMakerService: HistoryMakerService,
      private searchFormService: SearchFormService,
      private biographyStorySetService: BiographyStorySetService,
      private titleManagerService: TitleManagerService, private liveAnnouncer: LiveAnnouncer) {

        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)

        this.limitingBiographyAccession = this.globalState.NO_ACCESSION_CHOSEN;
        this.limitingBiographyPreferredName = "";
        this.simpleSearchPageTitle = "Search Page";
        this.simpleSearchPageTitleLong = "Search Page, The HistoryMakers Digital Archive";
        this.titleManagerService.setTitle(this.simpleSearchPageTitleLong);
        this.liveAnnouncer.announce(this.simpleSearchPageTitle); // NOTE: using LiveAnnouncer to eliminate possible double-speak
    }

    // NOTE: the route can give "forBio" indicating search is meant for biographies or for stories (default).
    // NOTE: When the search is not "forBio" then the route can give an ID indicating the search is within a given person's stories.
    ngOnInit() {
        // Settings related to cached counts (used in giving help about Topic Search)
        this.historyMakerService.getCorpusSpecifics().pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(corpusDetails => {
            this.updateTailoredSearchMessages(corpusDetails.biographies.all, corpusDetails.stories.all);
        });

        this.route.params.forEach((params: Params) => {
            var forBioSearchIndicator: number;
            var makeSearchBeForBiographies: boolean = false;

            if (params['forBio'] !== undefined && !isNaN(+params['forBio'])) {
                forBioSearchIndicator = +params['forBio'];
                makeSearchBeForBiographies = (forBioSearchIndicator == 1);
            }

            // Tune page title to one of Search into # Makers, Search into # Stories, or Search One Person's Stories,
            // and set search form service appropriately (so UI shortcuts like an icon button will load the correct search context)
            var confirmedIsBioSearch: boolean = false;
            var confirmedBioIDForSearch:number = this.globalState.NOTHING_CHOSEN;
            var confirmedBioAccession: string = this.globalState.NO_ACCESSION_CHOSEN;
            var confirmedUseOfAdvancedStorySearching: boolean = false; // this will likely stay false as this is "search-simple", not advanced
            if (makeSearchBeForBiographies) {
                this.UpdatePageTitle(this.tailoredBioSearchMessage);
                confirmedIsBioSearch = true;
                this.searchFormService.setSearchOptions(new SearchFormOptions(confirmedIsBioSearch, confirmedBioIDForSearch,
                  confirmedBioAccession, confirmedUseOfAdvancedStorySearching));
            }
            else
            {
                if (params['ID'] !== undefined) {
                    this.limitingBiographyAccession = params['ID'];
                    this.UpdatePageTitle("Search One Person's Stories");
                    this.biographyStorySetService.getStoriesInBiography(this.limitingBiographyAccession).pipe(takeUntil(this.ngUnsubscribe))
                    .subscribe(
                      bioDetail => {
                          if (bioDetail != null) {
                              this.limitingBiographyPreferredName = bioDetail.preferredName;
                              this.UpdatePageTitle("Search " + this.limitingBiographyPreferredName + " Stories");
                              confirmedBioIDForSearch = bioDetail.biographyID;
                              confirmedBioAccession = this.limitingBiographyAccession;
                              this.searchFormService.setSearchOptions(new SearchFormOptions(confirmedIsBioSearch, confirmedBioIDForSearch,
                                confirmedBioAccession, confirmedUseOfAdvancedStorySearching));
                          }
                          else {
                              // No biography details available, so back out to searching all stories
                              this.limitingBiographyAccession = this.globalState.NO_ACCESSION_CHOSEN;
                              this.limitingBiographyPreferredName = "";
                              this.UpdatePageTitle(this.tailoredStorySearchMessage);
                              this.searchFormService.setSearchOptions(new SearchFormOptions(confirmedIsBioSearch, confirmedBioIDForSearch,
                                confirmedBioAccession, confirmedUseOfAdvancedStorySearching));
                          }
                        },
                        error => {
                          // No biography details retrievable, so back out to searching all stories
                          this.limitingBiographyAccession = this.globalState.NO_ACCESSION_CHOSEN;
                          this.limitingBiographyPreferredName = "";
                          this.UpdatePageTitle(this.tailoredStorySearchMessage);
                          this.searchFormService.setSearchOptions(new SearchFormOptions(confirmedIsBioSearch, confirmedBioIDForSearch,
                            confirmedBioAccession, confirmedUseOfAdvancedStorySearching));
                        }
                    );
                }
                else {
                    // Just a story search, not search within a person
                    this.UpdatePageTitle(this.tailoredStorySearchMessage);
                    this.searchFormService.setSearchOptions(new SearchFormOptions(confirmedIsBioSearch, confirmedBioIDForSearch,
                      confirmedBioAccession, confirmedUseOfAdvancedStorySearching));
                }
            }
            // NOTE: Can't just position the this.searchFormService.setSearchOptions() call down here, because
            // sometimes the information is coming from a subscribe, i.e., a possibly delayed action.
        });
    }

    ngAfterViewChecked() {
        // Attempt focus to the query input element once everything is set up.
        var focusSetElsewhere: boolean = false;

        if (this.mySearchFormElement) {
            focusSetElsewhere = true;
            this.mySearchFormElement.setFocusToQueryInput();
        }

        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            if (!focusSetElsewhere)
                // default to focus on title if input focus not possible
                // since we did internally route in the SPA (single page application)
                this.signalFocusToTitle = true;
        }
    }

    private updateTailoredSearchMessages(biographyCount: number, storyCount: number) {
        if (biographyCount > 0)
            this.tailoredBioSearchMessage = "Search into " + biographyCount + " Makers";
        else
            this.tailoredBioSearchMessage = "Search Makers";

        if (storyCount > 0)
            this.tailoredStorySearchMessage = "Search into " + storyCount + " Stories";
        else
            this.tailoredStorySearchMessage = "Search Stories";

        var optionsNow: SearchFormOptions = this.searchFormService.currentSearchOptions();
        if (optionsNow != null) {
            if (optionsNow.searchingBiographies)
                this.UpdatePageTitle(this.tailoredBioSearchMessage);
            else if (optionsNow.biographyAccessionID == this.globalState.NO_ACCESSION_CHOSEN)
                this.UpdatePageTitle(this.tailoredStorySearchMessage);
            // else titling is composed for searching stories within a person
        }
        // else titling will need to conclude via other calls pending within ngInit logic
    }

    UpdatePageTitle(newTitle: string) {
        if (this.simpleSearchPageTitle != newTitle) {
            this.simpleSearchPageTitle = newTitle;
            this.simpleSearchPageTitleLong = this.simpleSearchPageTitle + ", The HistoryMakers Digital Archive";
            this.titleManagerService.setTitle(this.simpleSearchPageTitleLong);
        }
    }

}
