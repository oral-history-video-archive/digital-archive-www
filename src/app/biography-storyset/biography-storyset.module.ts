import { NgModule }       from '@angular/core';

import { BiographyStorySetComponent } from './biography-storyset.component';
import { biographyStorySetRouting } from './biography-storyset.routing';

import { StoryStampModule } from '../story-stamp/story-stamp.module';
import { USMapModule } from '../US-map/US-map.module';
import { SearchFormModule } from '../shared/search-form/search-form.module';
import { MyPanelModule } from '../shared/my-panel/my-panel.module';

import { SharedModule } from '../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        SharedModule,
        StoryStampModule,
        USMapModule,
        SearchFormModule,
        MyPanelModule,
        FlexLayoutModule,
        biographyStorySetRouting
    ],
    declarations: [
        BiographyStorySetComponent
    ]
})
export class BiographyStorySetModule { }
