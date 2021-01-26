import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { SharedModule } from '../shared.module';
import { SearchFormComponent } from './search-form.component';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        FlexLayoutModule
    ],
    declarations: [
      SearchFormComponent
    ],
    exports: [SearchFormComponent]
})
export class SearchFormModule { }
