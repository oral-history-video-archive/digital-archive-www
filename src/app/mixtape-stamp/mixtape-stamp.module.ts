import { NgModule }       from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MixtapeStampComponent } from './mixtape-stamp.component';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout
import { RouterModule } from '@angular/router';

@NgModule({
    imports: [
        RouterModule,
        SharedModule,
        FlexLayoutModule
    ],
    declarations: [
      MixtapeStampComponent
    ],
    exports: [MixtapeStampComponent]
})
export class MixtapeStampModule { }
