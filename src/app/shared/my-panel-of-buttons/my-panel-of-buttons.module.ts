import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { SharedModule } from '../shared.module';
import { MyPanelOfButtonsComponent } from './my-panel-of-buttons.component';
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        FlexLayoutModule
    ],
    declarations: [
      MyPanelOfButtonsComponent
    ],
    exports: [MyPanelOfButtonsComponent]
})
export class MyPanelOfButtonsModule { }
