import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, Params } from '@angular/router';
import { takeUntil } from "rxjs/operators";

import { TitleManagerService } from '../shared/title-manager.service';
import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';
import { BaseComponent } from '../shared/base.component';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title
import { GlobalState } from '../app.global-state';

@Component({
    selector: 'thda-settings',
    templateUrl: './user-settings.component.html',
    styleUrls: ['./user-settings.component.scss']
})
export class UserSettingsComponent extends BaseComponent implements OnInit {
    settingsPageTitle: string;
    settingsPageTitleLong: string;
    signalFocusToTitle: boolean = false; // is used in html rendering of this component

    defaultAutoPlay: boolean;
    defaultAutoAdvance: boolean;
    showBiographyLastNameFacetFilter: boolean;
    showBiographyDecadeOfBirthFacetFilter: boolean;
    showBiographyBirthStateFacetFilter: boolean;
    showBiographyJobTypeFacetFilter: boolean;
    showStoryUSStateFacetFilter: boolean;
    showStoryOrganizationFacetFilter: boolean;
    showStoryDecadeFacetFilter: boolean;
    showStoryYearFacetFilter: boolean;
    showStoryJobTypeFacetFilter: boolean;
    showStoryDecadeOfBirthFacetFilter: boolean;
    defaultHomeMixtape: boolean;
    defaultShowTopicSearch: boolean;

    constructor(private route: ActivatedRoute,
      private router: Router,
      private globalState: GlobalState,
      private titleManagerService: TitleManagerService,
      private userSettingsManagerService: UserSettingsManagerService, private liveAnnouncer: LiveAnnouncer) {

        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)
        userSettingsManagerService.autoplayVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.defaultAutoPlay = value;
        });
        userSettingsManagerService.autoadvanceVideo$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.defaultAutoAdvance = value;
        });

        // Settings related to a few optional experimental features: defaultHomeMixtape and defaultShowTopicSearch
        userSettingsManagerService.showHomeMixtapes$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.defaultHomeMixtape = value;
        });
        userSettingsManagerService.showTopicSearch$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.defaultShowTopicSearch = value;
        });

        // Settings related to visibility of certain filters for biography sets:
        userSettingsManagerService.showBiographyBirthStateFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showBiographyBirthStateFacetFilter = value;
        });
        userSettingsManagerService.showBiographyDecadeOfBirthFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showBiographyDecadeOfBirthFacetFilter = value;
        });
        userSettingsManagerService.showBiographyJobTypeFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showBiographyJobTypeFacetFilter = value;
        });
        userSettingsManagerService.showBiographyLastNameFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showBiographyLastNameFacetFilter = value;
        });

        // Settings related to visibility of certain filters for story sets:
        userSettingsManagerService.showStoryUSStateFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showStoryUSStateFacetFilter = value;
        });
        userSettingsManagerService.showStoryOrganizationFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showStoryOrganizationFacetFilter = value;
        });
        userSettingsManagerService.showStoryDecadeFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showStoryDecadeFacetFilter = value;
        });
        userSettingsManagerService.showStoryYearFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showStoryYearFacetFilter = value;
        });
        userSettingsManagerService.showStoryJobTypeFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showStoryJobTypeFacetFilter = value;
        });
        userSettingsManagerService.showStoryDecadeOfBirthFacetFilter$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((value) => {
          this.showStoryDecadeOfBirthFacetFilter = value;
        });
    }

    ngOnInit() {

        this.defaultAutoPlay = this.userSettingsManagerService.currentAutoplay();
        this.defaultAutoAdvance = this.userSettingsManagerService.currentAutoadvance();
        this.defaultHomeMixtape = this.userSettingsManagerService.currentShowMixtapesOnHomeRoute();
        this.defaultShowTopicSearch = this.userSettingsManagerService.currentShowTopicSearch();

        this.showBiographyBirthStateFacetFilter = this.userSettingsManagerService.currentShowBiographyBirthStateFacetFilter();
        this.showBiographyDecadeOfBirthFacetFilter = this.userSettingsManagerService.currentShowBiographyDecadeOfBirthFacetFilter();
        this.showBiographyJobTypeFacetFilter = this.userSettingsManagerService.currentShowBiographyJobTypeFacetFilter();
        this.showBiographyLastNameFacetFilter = this.userSettingsManagerService.currentShowBiographyLastNameFacetFilter();
        this.showStoryUSStateFacetFilter = this.userSettingsManagerService.currentShowStoryUSStateFacetFilter();
        this.showStoryOrganizationFacetFilter = this.userSettingsManagerService.currentShowStoryOrganizationFacetFilter();
        this.showStoryDecadeFacetFilter = this.userSettingsManagerService.currentShowStoryDecadeFacetFilter();
        this.showStoryYearFacetFilter = this.userSettingsManagerService.currentShowStoryYearFacetFilter();
        this.showStoryJobTypeFacetFilter = this.userSettingsManagerService.currentShowStoryJobTypeFacetFilter();
        this.showStoryDecadeOfBirthFacetFilter = this.userSettingsManagerService.currentShowStoryDecadeOfBirthFacetFilter();

        this.settingsPageTitle = "User Settings";
        this.settingsPageTitleLong = "User Settings, The HistoryMakers Digital Archive";
        this.titleManagerService.setTitle(this.settingsPageTitleLong);
        this.liveAnnouncer.announce("User Settings"); // NOTE: using LiveAnnouncer to eliminate possible double-speak
        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            // Set default focus to the title for this route, since we did internally route
            // in the SPA (single page application)
            // (as it is the target for skip-to-main content as well)
            this.signalFocusToTitle = true;
        }
    }

    onAutoPlayChange(isChecked: boolean) {
      this.userSettingsManagerService.updateAutoPlay(isChecked);
    }

    onAutoAdvanceChange(isChecked: boolean) {
      this.userSettingsManagerService.updateAutoAdvance(isChecked);
    }

    onHomeMixtapeChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowMixtapesOnHomeRoute(isChecked);
    }

    onShowTopicSearchChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowTopicSearch(isChecked);
    }

    onShowBiographyBirthStateFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowBiographyBirthStateFacetFilter(isChecked);
    }
    onShowBiographyLastNameFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowBiographyLastNameFacetFilter(isChecked);
    }
    onShowBiographyDecadeOfBirthFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowBiographyDecadeOfBirthFacetFilter(isChecked);
    }
    onShowBiographyJobTypeFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowBiographyJobTypeFacetFilter(isChecked);
    }

    onShowStoryUSStateFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowStoryUSStateFacetFilter(isChecked);
    }
    onShowStoryOrganizationFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowStoryOrganizationFacetFilter(isChecked);
    }
    onShowStoryDecadeFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowStoryDecadeFacetFilter(isChecked);
    }
    onShowStoryYearFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowStoryYearFacetFilter(isChecked);
    }
    onShowStoryJobTypeFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowStoryJobTypeFacetFilter(isChecked);
    }
    onShowStoryDecadeOfBirthFacetFilterChange(isChecked: boolean) {
      this.userSettingsManagerService.updateShowStoryDecadeOfBirthFacetFilter(isChecked);
    }

}
