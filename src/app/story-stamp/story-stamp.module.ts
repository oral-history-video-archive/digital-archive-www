import { NgModule }       from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { StoryStampComponent } from './story-stamp.component';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout
import { RouterModule } from '@angular/router';
@NgModule({
    imports: [
        RouterModule,
        SharedModule,
        FlexLayoutModule
    ],
    declarations: [
        StoryStampComponent
    ],
    exports: [StoryStampComponent]
})
export class StoryStampModule { }
