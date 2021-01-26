import { Component, EventEmitter, HostListener, Input, Output } from "@angular/core";

// CREDIT: strongly inspired by mat-video: https://github.com/nkoehler/mat-video
@Component({
  selector: "my-video-cc-button",
  templateUrl: "./my-video-cc-button.component.html",
  styleUrls: ["./my-video-cc-button.component.scss"]
})

export class MyVideoClosedCaptionButtonComponent {
  @Input() video: HTMLVideoElement;

  @Input() CCshown = false;

  @Output() CCDisplayChanged = new EventEmitter<boolean>();

  constructor() {}

  toggleCCDisplay(): void {
    this.CCshown = !this.CCshown;
    // FYI: take action on this.video based on new value for CCshown...
    this.CCDisplayChanged.emit(this.CCshown);
  }
}
