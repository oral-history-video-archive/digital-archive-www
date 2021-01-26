import { NgModule }       from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { USMapComponent } from './US-map.component';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout
import { MyPanelModule } from '../shared/my-panel/my-panel.module';

@NgModule({
    imports: [
        SharedModule,
        MyPanelModule,
        FlexLayoutModule
    ],
    declarations: [
      USMapComponent
    ],
    exports: [USMapComponent]
})
export class USMapModule { }
