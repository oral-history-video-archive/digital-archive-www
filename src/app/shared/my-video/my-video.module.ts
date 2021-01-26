// CREDIT:  Strongly inspired by mat-video video player for Angular 9, https://github.com/nkoehler/mat-video
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSliderModule } from "@angular/material/slider";

import { MyVideoPlayButtonComponent } from "./ui/my-video-play-button/my-video-play-button.component";
import { MyVideoClosedCaptionButtonComponent } from "./ui/my-video-cc-button/my-video-cc-button.component";
import { MyVideoFastForwardButtonComponent } from "./ui/my-video-ffwd-button/my-video-ffwd-button.component";
import { MyVideoRewindButtonComponent } from "./ui/my-video-rewind-button/my-video-rewind-button.component";

import { SecondsToTimePipe } from "./seconds-to-time.pipe";
import { MyVideoSpinnerComponent } from "./ui/my-video-spinner/my-video-spinner.component";
import { MyVideoComponent } from "./my-video.component";
import { EventService } from "./services/event.service";
import { FlexLayoutModule } from '@angular/flex-layout'; // for flex layout

@NgModule({
  declarations: [
    SecondsToTimePipe,
    MyVideoComponent,
    MyVideoPlayButtonComponent,
    MyVideoClosedCaptionButtonComponent,
    MyVideoFastForwardButtonComponent,
    MyVideoRewindButtonComponent,
    MyVideoSpinnerComponent
  ],
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatIconModule,
    MatButtonModule,
    MatSliderModule
  ],
  exports: [MyVideoComponent],
  providers: [EventService]
})
export class MyVideoModule {}
