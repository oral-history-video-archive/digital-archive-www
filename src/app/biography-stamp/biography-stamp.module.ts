import { NgModule }       from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { BiographyStampComponent } from './biography-stamp.component';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout
import { RouterModule } from '@angular/router';
@NgModule({
    imports: [
        RouterModule,
        SharedModule,
        FlexLayoutModule
    ],
    declarations: [
        BiographyStampComponent
    ],
    exports: [BiographyStampComponent]
})
export class BiographyStampModule { }
