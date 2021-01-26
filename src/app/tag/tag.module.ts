import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { TagComponent } from './tag.component';
import { tagRouting } from './tag.routing';

import { TagChosenSetService } from './tag-chosen-set.service';
import { TagService } from './tag.service';

import { MyPanelModule } from '../shared/my-panel/my-panel.module';
import { SharedModule } from '../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        tagRouting,
        MyPanelModule,
        FlexLayoutModule,
        SharedModule
    ],
    declarations: [
        TagComponent
    ],
    providers: [
        TagChosenSetService,
        TagService
    ]
})
export class TagModule { }
