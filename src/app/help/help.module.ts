import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { HelpComponent } from './help.component';
import { HelpSearchComponent } from './help-topics/help-search.component';
import { HelpSearchInOneComponent } from './help-topics/help-search-in-one.component';
import { HelpUserSettingsComponent } from './help-topics/help-user-settings.component';
import { HelpExtraOptionsComponent } from './help-topics/help-extra-options.component';
import { HelpAckComponent } from './help-topics/help-ack.component';
import { HelpCiteComponent } from './help-topics/help-cite.component';
import { HelpDataComponent } from './help-topics/help-data.component';
import { HelpFacetOriginsComponent } from './help-topics/help-facet-origins.component';
import { HelpFacetsComponent } from './help-topics/help-facets.component';
import { HelpReturnAllComponent } from './help-topics/help-return-all.component';
import { HelpPlaylistComponent } from './help-topics/help-playlist.component';
import { HelpPrivacyComponent } from './help-topics/help-privacy.component';
import { HelpPublicationsComponent } from './help-topics/help-publications.component';
import { HelpTermsComponent } from './help-topics/help-terms.component';
import { helpRouting } from './help.routing';
import { SharedModule } from '../shared/shared.module';

import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        SharedModule,
        CommonModule,
        FormsModule,
        FlexLayoutModule,
        helpRouting
    ],
    declarations: [
        HelpComponent,
        HelpSearchComponent,
        HelpSearchInOneComponent,
        HelpUserSettingsComponent,
        HelpExtraOptionsComponent,
        HelpAckComponent,
        HelpCiteComponent,
        HelpDataComponent,
        HelpFacetOriginsComponent,
        HelpFacetsComponent,
        HelpReturnAllComponent,
        HelpPlaylistComponent,
        HelpPrivacyComponent,
        HelpPublicationsComponent,
        HelpTermsComponent
    ]
})
export class HelpModule { }
