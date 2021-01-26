import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { ContentLinksComponent } from './content-links.component';
import { contentLinksRouting } from './content-links.routing';

import { SharedModule } from '../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        FlexLayoutModule,
        SharedModule,
        contentLinksRouting
    ],
    declarations: [
      ContentLinksComponent
    ]
})
export class ContentLinksModule { }
