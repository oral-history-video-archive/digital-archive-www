import { Component, OnInit } from '@angular/core';
import { takeUntil } from "rxjs/operators";

import { HistoryMakerService } from '../historymakers/historymaker.service';
import { TitleManagerService } from '../shared/title-manager.service';
import { SearchFormService } from '../shared/search-form/search-form.service';
import { StorySetType } from '../storyset/storyset-type';

import { GlobalState } from '../app.global-state';
import { environment } from '../../environments/environment';

import { BriefBio } from '../historymakers/brief-bio';

import { Mixtape } from '../mixtape-stamp/mixtape';

import { SearchFormOptions } from '../shared/search-form/search-form-options';
import { BaseComponent } from '../shared/base.component';
import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title

@Component({
    selector: 'thda-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent extends BaseComponent implements OnInit {
    txtQuery: string = ""; // this is the query string as edited by the user

    storyCount: string;
    biographyCount: string;
    lastUpdateDatePhrase: string = "";
    today: number = Date.now();

    biographies: BriefBio[];
    signalFocusToBiographyID: string; // is used in html rendering of this component

    confirmedNoBirthdays: boolean;
    showMixtapes: boolean = false; // value will be read and set from userSettingsManagerService
    mixtapes: Mixtape[];
    signalFocusToMixtapeID: number;

    signalFocusToTitle: boolean;
    public myMediaBase: string;

    constructor(
        private globalState: GlobalState,
        private historyMakerService: HistoryMakerService,
        private userSettingsManagerService: UserSettingsManagerService,
        private titleManagerService: TitleManagerService,
        private searchFormService: SearchFormService, private liveAnnouncer: LiveAnnouncer) {

        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)

        // Start off with an empty signal about what to focus on
        this.clearSignalsForCurrentFocusSetting();

        this.myMediaBase = environment.mediaBase;
        this.mixtapes = environment.mixtapes;

        userSettingsManagerService.showHomeMixtapes$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
            this.showMixtapes = value;
        });

        this.searchFormService.setSearchOptions(new SearchFormOptions(false, this.globalState.NOTHING_CHOSEN, this.globalState.NO_ACCESSION_CHOSEN, false));
    }

    ngOnInit() {
        this.titleManagerService.setTitle("The HistoryMakers Digital Archive (January 22, 2021)");
        this.liveAnnouncer.announce("The HistoryMakers Digital Archive"); // NOTE: using LiveAnnouncer to eliminate possible double-speak
        this.showMixtapes = this.userSettingsManagerService.currentShowMixtapesOnHomeRoute();

        this.historyMakerService.getCorpusSpecifics().pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(corpusDetails => {
                this.storyCount = corpusDetails.stories.all.toLocaleString();
                var lastUpdateDateString:string = corpusDetails.lastUpdated;
                if (lastUpdateDateString && lastUpdateDateString.length > 0) {
                    var lastUpdateDate: Date = new Date(lastUpdateDateString);
                    this.lastUpdateDatePhrase = "as of " +
                      this.globalState.cleanedMonthDayYearFromNumbers(lastUpdateDate.getMonth(), lastUpdateDate.getDate(),
                        lastUpdateDate.getFullYear());
                }
                this.biographyCount = corpusDetails.biographies.all.toLocaleString();
            });

        // Do not qualify the people born this day in any way (i.e., no filtering, no paging): just get them all (hence null filtering/paging parameters):
        this.historyMakerService.getHistoryMakersBornThisDay(null, null, null, null, null, null, null, null).pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(retSet => {
                this.biographies = retSet.biographies;
                if (this.biographies == null || this.biographies.length == 0) {
                    this.confirmedNoBirthdays = true;
                }
                this.setFocusAsNeeded(); // with contents fully loaded - set the focus
            });
    }

    private setFocusAsNeeded() {
        var focusSetElsewhere: boolean = false;

        // Attempt scroll and focus to selected mixtape set, if any, once everything is set up.
        var selectedItem = this.userSettingsManagerService.currentMixtapeIDToFocus();
        if (selectedItem != this.globalState.NOTHING_CHOSEN) {
            this.signalFocusToMixtapeID = selectedItem;
            focusSetElsewhere = true;
            // Once used, clear it.
            this.userSettingsManagerService.updateMixtapeIDToFocus(this.globalState.NOTHING_CHOSEN);
        }
        // Check on scroll and focus to selected biography item once everything is set up, but only do focus/scroll action
        // if focus is not set to something else above.
        var selectedBioIDItem = this.userSettingsManagerService.currentBioIDToFocus();
        if (selectedBioIDItem && selectedBioIDItem.length > 0) {
            if (!focusSetElsewhere) {
                this.signalFocusToBiographyID = selectedBioIDItem; // can focus to biography item because nothing else was picked earlier
                focusSetElsewhere = true;
            }
            // Once used, or once something else was focused on via "focusSetElsewhere", clear the bio id to focus.
            this.userSettingsManagerService.updateBioIDToFocus("");
        }

        this.userSettingsManagerService.updateStoryIDToFocus(this.globalState.NOTHING_CHOSEN); // forget any story ID to focus

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
        this.signalFocusToBiographyID = "";
        this.signalFocusToMixtapeID = this.globalState.NOTHING_CHOSEN;
        this.signalFocusToTitle = false;
    }

}
