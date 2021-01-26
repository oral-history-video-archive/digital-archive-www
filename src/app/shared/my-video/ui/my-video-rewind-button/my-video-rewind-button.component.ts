import { Component, EventEmitter, Output } from "@angular/core";

@Component({
  selector: "my-video-rewind-button",
  templateUrl: "./my-video-rewind-button.component.html",
  styleUrls: ["./my-video-rewind-button.component.scss"]
})

export class MyVideoRewindButtonComponent {
  @Output() RewindIssued = new EventEmitter<boolean>();

  constructor() {}

  issueRewind(): void {
    // FYI: take action based on issuance of RewindIssued...
    this.RewindIssued.emit();
  }
}
