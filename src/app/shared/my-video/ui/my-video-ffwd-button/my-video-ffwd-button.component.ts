import { Component, EventEmitter, Output } from "@angular/core";

@Component({
  selector: "my-video-ffwd-button",
  templateUrl: "./my-video-ffwd-button.component.html",
  styleUrls: ["./my-video-ffwd-button.component.scss"]
})

export class MyVideoFastForwardButtonComponent {
  @Output() FFwdIssued = new EventEmitter<boolean>();

  constructor() {}

  issueFastForward(): void {
    // FYI: take action based on issuance of FFwdIssued...
    this.FFwdIssued.emit();
  }
}
