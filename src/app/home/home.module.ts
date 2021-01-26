import { NgModule }       from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';

import { HomeComponent } from './home.component';
import { homeRouting } from './home.routing';
import { SharedModule } from '../shared/shared.module';
import { SearchFormModule } from '../shared/search-form/search-form.module';

import { RouteNotFoundComponent } from './not-found.component';
import { BiographyStampModule } from '../biography-stamp/biography-stamp.module';
import { MixtapeStampModule } from '../mixtape-stamp/mixtape-stamp.module';

import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

import { KeysPipe } from './keys.pipe';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        FlexLayoutModule,
        SearchFormModule,
        BiographyStampModule,
        MixtapeStampModule,
        homeRouting
    ],
    declarations: [
        HomeComponent,
        RouteNotFoundComponent,
        KeysPipe
    ]
})
export class HomeModule { }
