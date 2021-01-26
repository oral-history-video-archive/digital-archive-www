import { NgModule }       from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { BiographyResultStampComponent } from './biography-result-stamp.component';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout
import { RouterModule } from '@angular/router';
@NgModule({
    imports: [
        RouterModule,
        SharedModule,
        FlexLayoutModule
    ],
    declarations: [
      BiographyResultStampComponent
    ],
    exports: [BiographyResultStampComponent]
})
export class BiographyResultStampModule { }
