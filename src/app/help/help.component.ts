import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, Params } from '@angular/router';

import { TitleManagerService } from '../shared/title-manager.service';
import { SearchFormService } from '../shared/search-form/search-form.service';
import { SearchFormOptions } from '../shared/search-form/search-form-options';
import { GlobalState } from '../app.global-state';
import { ThinBaseComponent } from '../shared/thinbase.component';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title

@Component({
    selector: 'thda-help',
    templateUrl: './help.component.html',
    styleUrls: ['./help.component.scss']
})
export class HelpComponent extends ThinBaseComponent implements OnInit {
    helpPageTitle: string;
    helpPageTitleLong: string;
    signalFocusToTitle: boolean = false; // is used in html rendering of this component

    constructor(private route: ActivatedRoute,
        private router: Router,
        private globalState: GlobalState,
        private titleManagerService: TitleManagerService,
        private searchFormService: SearchFormService, private liveAnnouncer: LiveAnnouncer) {
          super(); // for ThinBaseComponent extension (brought in for mouse event handler noMouseFocus)

        this.searchFormService.setSearchOptions(new SearchFormOptions(false, this.globalState.NOTHING_CHOSEN, this.globalState.NO_ACCESSION_CHOSEN, false));
    }

    ngOnInit() {
        this.helpPageTitle = "Help Page";
        this.helpPageTitleLong = "Help Page, The HistoryMakers Digital Archive";
        this.titleManagerService.setTitle(this.helpPageTitleLong);
        this.liveAnnouncer.announce(this.helpPageTitle); // NOTE: using LiveAnnouncer to eliminate possible double-speak
        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            // Set default focus to the title for this route, since we did internally route
            // in the SPA (single page application)
            // (as it is the target for skip-to-main content as well)
            this.signalFocusToTitle = true;
        }
    }
}
