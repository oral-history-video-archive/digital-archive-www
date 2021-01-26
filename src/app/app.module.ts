import { APP_INITIALIZER, NgModule } from '@angular/core';

import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent }  from './app.component';
import { routing, appRoutingProviders } from './app.routing';

import { AuthInterceptor } from './auth/auth.interceptor';
import { HomeModule } from './home/home.module';
import { HistoryMakersModule } from './historymakers/historymakers.module';
import { BiographyResultStampModule } from './biography-result-stamp/biography-result-stamp.module';
import { BiographyStampModule } from './biography-stamp/biography-stamp.module';
import { StoryStampModule } from './story-stamp/story-stamp.module';
import { StorySetModule } from './storyset/storyset.module';
import { TagModule } from './tag/tag.module';
import { HelpModule } from './help/help.module';
import { StoryAdvancedSearchModule } from './story-advanced-search/story-advanced-search.module';
import { StoryModule } from './story/story.module';
import { BiographyStorySetModule } from './biography-storyset/biography-storyset.module';
import { BiographyAdvancedSearchModule } from './biography-advanced-search/bio-advanced-search.module';
import { SearchFormModule } from './shared/search-form/search-form.module';
import { MyPanelModule } from './shared/my-panel/my-panel.module';
import { MyPanelOfButtonsModule } from './shared/my-panel-of-buttons/my-panel-of-buttons.module';
import { SearchSimpleModule } from './search-simple/search-simple.module';
import { ContentLinksModule } from './content-links/content-links.module';
import { UserSettingsModule } from './user-settings/user-settings.module';

import { TitleManagerService } from './shared/title-manager.service';
import { HistoryMakerService } from './historymakers/historymaker.service';
import { StoryDetailService } from './story/story-detail.service';
import { TextSearchService } from './text-search/text-search.service';
import { IDSearchService } from './id-search/id-search.service';
import { FeedbackService } from './feedback/feedback.service';
import { BiographyStorySetService } from './biography-storyset/biography-storyset.service';
import { SearchFormService } from './shared/search-form/search-form.service';
import { PlaylistManagerService } from './playlist-manager/playlist-manager.service';
import { UserSettingsManagerService } from './user-settings/user-settings-manager.service';
import { StoryAdvancedSearchSettingsManagerService } from './story-advanced-search/story-advanced-search-manager.service';
import { USMapManagerService } from './US-map/US-map-manager.service';

import { GlobalState } from './app.global-state';
import { SharedModule } from './shared/shared.module';

// TODO: investigate use of BrowserAnimationsModule animations, esp. for modal entry/exit:
// import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CdkTableModule } from '@angular/cdk/table';
import { A11yModule } from '@angular/cdk/a11y';
import { BidiModule } from '@angular/cdk/bidi';
import { OverlayModule } from '@angular/cdk/overlay';
import { PlatformModule } from '@angular/cdk/platform';
import { ObserversModule } from '@angular/cdk/observers';
import { PortalModule } from '@angular/cdk/portal';
import { CdkStepperModule } from '@angular/cdk/stepper';
import {ClipboardModule} from '@angular/cdk/clipboard';

import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout
import { AnalyticsService } from './ll-analytics.service';

import {AppContentsComponent} from './app-contents/app-contents.component';

@NgModule({
  imports: [
    FlexLayoutModule,
    BrowserModule,
    FormsModule,
    CdkTableModule,
    A11yModule,
    BidiModule,
    OverlayModule,
    PlatformModule,
    ObserversModule,
    PortalModule,
    CdkStepperModule,
    ClipboardModule,
    routing,
    HttpClientModule,
    HistoryMakersModule,
    BiographyResultStampModule,
    BiographyStampModule,
    StoryStampModule,
    StorySetModule,
    TagModule,
    HelpModule,
    StoryAdvancedSearchModule,
    BiographyStorySetModule,
    BiographyAdvancedSearchModule,
    SearchFormModule,
    MyPanelModule,
    MyPanelOfButtonsModule,
    SearchSimpleModule,
    ContentLinksModule,
    UserSettingsModule,
    StoryModule,
    SharedModule,
    HomeModule // NOTE: HomeModule must be last in this list, with its wildcard support to catch router-not-found paths
  ],
  declarations: [
    AppComponent,
    AppContentsComponent
  ],
  providers: [
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    Title,
    TitleManagerService,
    appRoutingProviders,
    HistoryMakerService,
    TextSearchService,
    IDSearchService,
    StoryDetailService,
    FeedbackService,
    BiographyStorySetService,
    SearchFormService,
    PlaylistManagerService,
    UserSettingsManagerService,
    StoryAdvancedSearchSettingsManagerService,
    USMapManagerService,
    AnalyticsService,
    GlobalState
  ],
  bootstrap: [ AppComponent ]
})

export class AppModule { }
