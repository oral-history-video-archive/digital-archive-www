import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { StoryAdvancedSearchComponent } from './story-advanced-search.component';
import { storyAdvancedSearchRouting } from './story-advanced-search.routing';
import { SearchFormModule } from '../shared/search-form/search-form.module';

import { SharedModule } from '../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        FlexLayoutModule,
        SearchFormModule,
        storyAdvancedSearchRouting
    ],
    declarations: [
        StoryAdvancedSearchComponent
    ]
})
export class StoryAdvancedSearchModule { }
