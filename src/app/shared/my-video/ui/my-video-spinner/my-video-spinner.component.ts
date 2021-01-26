import { AfterViewInit, Component, Input, OnDestroy, Renderer2 } from "@angular/core";

import { EventHandler } from "../../interfaces/event-handler.interface";
import { EventService } from "../../services/event.service";

// CREDIT: https://github.com/nkoehler/mat-video/blob/master/projects/mat-video/src/lib/ui/mat-video-spinner/mat-video-spinner.component.ts
@Component({
  selector: "my-video-spinner",
  templateUrl: "./my-video-spinner.component.html",
  styleUrls: [
    "./my-video-spinner.component.scss"
  ]
})
export class MyVideoSpinnerComponent implements AfterViewInit, OnDestroy {
  @Input() video: HTMLVideoElement;

  videoBuffering = false;

  private events: EventHandler[] = [];

  constructor(private renderer: Renderer2, private evt: EventService) {}

  ngAfterViewInit(): void {
    this.events = [
      { element: this.video, name: "loadstart", callback: event => (this.videoBuffering = true), dispose: null },
      { element: this.video, name: "loadedmetadata", callback: event => (this.videoBuffering = false), dispose: null },
      { element: this.video, name: "playing", callback: event => (this.videoBuffering = false), dispose: null },
      { element: this.video, name: "waiting", callback: event => (this.videoBuffering = true), dispose: null },
      { element: this.video, name: "durationchange", callback: event => (this.videoBuffering = true), dispose: null }
    ];

    this.video.onloadeddata = () => (this.videoBuffering = false);

    this.evt.addEvents(this.renderer, this.events);
  }

  ngOnDestroy(): void {
    this.video.onloadeddata = null;

    this.evt.removeEvents(this.events);
  }
}
