import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { BiographyAdvancedSearchComponent } from './bio-advanced-search.component';
import { biographyAdvancedSearchRouting } from './bio-advanced-search.routing';
import { SharedModule } from '../shared/shared.module';
import { SearchFormModule } from '../shared/search-form/search-form.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        SearchFormModule,
        FlexLayoutModule,
        biographyAdvancedSearchRouting
    ],
    declarations: [
        BiographyAdvancedSearchComponent
    ]
})
export class BiographyAdvancedSearchModule { }
