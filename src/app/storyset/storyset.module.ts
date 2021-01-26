import { NgModule }       from '@angular/core';

import { StoryStampModule } from '../story-stamp/story-stamp.module';
import { USMapModule } from '../US-map/US-map.module';

import { StorySetComponent } from './storyset.component';
import { storysetRouting } from './storyset.routing';
import { SearchFormModule } from '../shared/search-form/search-form.module';
import { MyPanelModule } from '../shared/my-panel/my-panel.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

import { SharedModule } from '../shared/shared.module';

@NgModule({
    imports: [
        SharedModule,
        StoryStampModule,
        USMapModule,
        SearchFormModule,
        MyPanelModule,
        FlexLayoutModule,
        storysetRouting
    ],
    declarations: [
        StorySetComponent
    ]
})
export class StorySetModule { }
