import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { StoryComponent } from './story.component';
import { storyRouting } from './story.routing';
import { StoryStampModule } from '../story-stamp/story-stamp.module';

import { SharedModule } from '../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        SharedModule,
        FlexLayoutModule,
        storyRouting,
        StoryStampModule
    ],
    declarations: [
        StoryComponent
    ]
})
export class StoryModule { }
