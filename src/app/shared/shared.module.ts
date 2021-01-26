import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { FormsModule }          from '@angular/forms';

import { ScrollToMeDirective }  from './scroll-to-me.directive';
import { FocusMeDirective } from './focus-me.directive';

import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MyVideoModule } from './my-video/my-video.module';

// NOTE:  Template for this module is: https://angular.io/docs/ts/latest/guide/ngmodule.html#!#shared-module

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        FlexLayoutModule,
        BrowserAnimationsModule,
        MyVideoModule
        ],
    declarations: [
        ScrollToMeDirective,
        FocusMeDirective
        ],
    exports: [
        ScrollToMeDirective,
        FocusMeDirective,
        CommonModule,
        FormsModule,
        MyVideoModule
        ]
})
export class SharedModule { }
