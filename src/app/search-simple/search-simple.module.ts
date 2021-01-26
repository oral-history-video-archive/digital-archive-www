import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { SearchSimpleComponent } from './search-simple.component';
import { searchSimpleRouting } from './search-simple.routing';
import { SearchFormModule } from '../shared/search-form/search-form.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout
import { SharedModule } from '../shared/shared.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        SearchFormModule,
        FlexLayoutModule,
        searchSimpleRouting
    ],
    declarations: [
      SearchSimpleComponent
    ]
})
export class SearchSimpleModule { }
