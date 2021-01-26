import { NgModule }       from '@angular/core';

import { HistoryMakersComponent } from './historymakers.component';
import { BiographyResultStampModule } from '../biography-result-stamp/biography-result-stamp.module';
import { USMapModule } from '../US-map/US-map.module';
import { SearchFormModule } from '../shared/search-form/search-form.module';
import { MyPanelModule } from '../shared/my-panel/my-panel.module';
import { MyPanelOfButtonsModule } from '../shared/my-panel-of-buttons/my-panel-of-buttons.module';

import { historymakersRouting } from './historymakers.routing';

import { SharedModule } from '../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        SharedModule,
        BiographyResultStampModule,
        USMapModule,
        SearchFormModule,
        MyPanelModule,
        MyPanelOfButtonsModule,
        FlexLayoutModule,
        historymakersRouting
    ],
    declarations: [
        HistoryMakersComponent
    ]
})
export class HistoryMakersModule { }
