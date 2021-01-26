import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, Params } from '@angular/router';

import { TitleManagerService } from '../../shared/title-manager.service';
import { ThinBaseComponent }  from '../../shared/thinbase.component';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title
import { GlobalState } from '../../app.global-state';

@Component({
    selector: 'thda-help-facets',
    templateUrl: './help-facets.component.html',
    styleUrls: ['../help.component.scss']
})
export class HelpFacetsComponent extends ThinBaseComponent implements OnInit {
    signalFocusToTitle: boolean = false; // is used in html rendering of this component

    constructor(private route: ActivatedRoute,
        private router: Router,
        private globalState: GlobalState,
        private titleManagerService: TitleManagerService, private liveAnnouncer: LiveAnnouncer) {
          super(); // for ThinBaseComponent extension (brought in for mouse event handler noMouseFocus)
    }

    ngOnInit() {
        var leadingPiece: string = "Help Page, Search Facets";
        this.titleManagerService.setTitle(leadingPiece + ", The HistoryMakers Digital Archive");
        this.liveAnnouncer.announce(leadingPiece); // NOTE: using LiveAnnouncer to eliminate possible double-speak
        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            // Set default focus to the title for this route, since we did internally route
            // in the SPA (single page application)
            // (as it is the target for skip-to-main content as well)
            this.signalFocusToTitle = true;
        }
    }

}
