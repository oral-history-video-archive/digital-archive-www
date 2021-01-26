import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router, Params } from '@angular/router';

import { TitleManagerService } from '../shared/title-manager.service';
import { ThinBaseComponent }  from '../shared/thinbase.component';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to set title

@Component({
    selector: 'thda-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./home.component.scss']
})
export class RouteNotFoundComponent extends ThinBaseComponent implements OnInit {
    signalFocusToTitle: boolean = false; // is used in html rendering of this component
    constructor(private route: ActivatedRoute,
        private router: Router,
        private titleManagerService: TitleManagerService, private liveAnnouncer: LiveAnnouncer) {
          super(); // for ThinBaseComponent extension (brought in for mouse event handler noMouseFocus)
    }

    ngOnInit() {
        var title: string = "Page Not Found, The HistoryMakers Digital Archive";
        this.titleManagerService.setTitle(title);
        this.liveAnnouncer.announce(title); // NOTE: using LiveAnnouncer to eliminate possible double-speak

        // NOTE: no expectation, and hence no code, to set focus to title
        // because of this.globalState.IsInternalRoutingWithinSPA being true since there
        // should be no internal routing in the single page application (SPA) to a not-found route.
    }

}
