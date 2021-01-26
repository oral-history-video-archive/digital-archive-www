// CREDIT: greatly inspired by mat-video (https://github.com/nkoehler/mat-video) with subset of that functionality here;
// see https://github.com/nkoehler/mat-video/blob/master/projects/mat-video/src/lib/video.component.ts
import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, Renderer2, SimpleChanges, ViewChild, OnInit} from "@angular/core";
import { ThemePalette } from "@angular/material/core";

import { EventHandler } from "./interfaces/event-handler.interface";
import { EventService } from "./services/event.service";

import { UserSettingsManagerService } from '../../user-settings/user-settings-manager.service';
import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to closed captioning, as asked for by accessibility experts
import { GlobalState }          from '../../app.global-state';

@Component({
  selector: 'my-video',
  templateUrl: './my-video.component.html',
  styleUrls: ['./my-video.component.scss']
})

export class MyVideoComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('thmplayer', { static: false }) player: ElementRef;
  @ViewChild('video', { static: false }) video: ElementRef;

  // communicates transcript time and end of video to parent component
  @Output() timeChange: EventEmitter<number> = new EventEmitter();
  @Output() ended: EventEmitter<any> = new EventEmitter();

  @Input() src: string | MediaStream | MediaSource | Blob = null;
  @Input() urlToCCIndicator: string = null;
  @Input() poster: string = null;

  @Input() color: ThemePalette = "primary"; // other options: accent, ....
  @Input() keyboard = true;
  @Input() muted = false;
  @Output() mutedChange = new EventEmitter<boolean>();

  private readonly OFFSET_FOR_FFWD_AND_REWIND:number = 5; // move in increments of 5% for rewind and fast-forward

  @Input()
  get time() {
    return this.getVideoTag().currentTime;
  }

  set time(val: number) {
      if (val == null)
          return; // give up early on null or undefined input

      const MEANINGFUL_TIME_DELTA = 0.0001; // ignore any jitters at values at or under this threshold
      const video: HTMLVideoElement = this.getVideoTag();
      if (video) {
          const videoLength = video.duration;
          if (val > videoLength) {
              val = videoLength;
          }
          if (val < 0) {
              val = 0;
          }
          if (Math.abs(val - video.currentTime) > MEANINGFUL_TIME_DELTA) {
              video.currentTime = val;
          }
          if (Math.abs(this.lastTime - video.currentTime) > MEANINGFUL_TIME_DELTA) {
              setTimeout(() => this.timeChange.emit(video.currentTime), 0);
              this.lastTime = video.currentTime;
          }
          if (!this.isPercentInFlux && videoLength > 0) {
              // since curTimePercent not updated in evTimeUpdate, always do so here UNLESS user is manipulating the slider,
              // signaled with isPercentInFlux; note that curTimePercent is rounded to the nearest integer for better accessibility
              // as this value is read for screen reader users.
              this.curTimePercent = Math.round((val * 100) / videoLength);
          }
      }
  }

  playing = false;

  videoWidth: number;
  videoHeight: number;
  lastTime: number = -1;
  curTimePercent: number = 0;
  isPercentInFlux: boolean = false;

  videoLoaded = false;
  activeCCPiece: string = ""; // used to support Braille readers wanting control over active closed caption

  private srcObjectURL: string;

  private isMouseMoving = false;
  private isMouseMovingTimer: NodeJS.Timer;
  private isMouseMovingTimeout = 2000;

  private events: EventHandler[];

  // NOTE: There are many cautions against using autoplay, e.g., https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/autoplay --
  // leave it up to the user to turn it on if he/she so desires.
  defaultAutoPlay: boolean;

  currentCCDisplayState: boolean;

  constructor(private _renderer: Renderer2, private evt: EventService,
    private globalState: GlobalState, private liveAnnouncer: LiveAnnouncer,
    private userSettingsManagerService: UserSettingsManagerService) {}

  ngOnInit(): void {
    this.defaultAutoPlay = this.userSettingsManagerService.currentAutoplay();
    this.currentCCDisplayState = this.userSettingsManagerService.currentCCText();
  }

  ngAfterViewInit(): void {
    this.events = [
      {
        element: this.video.nativeElement,
        name: "loadstart",
        callback: event => this.evLoadStatusChange(true),
        dispose: null
      },
      {
        element: this.video.nativeElement,
        name: "loadedmetadata",
        callback: event => this.evLoadedMetadata(event),
        dispose: null
      },
      {
        element: this.video.nativeElement,
        name: "error",
        callback: event => console.error("Unhandled Video Error", event),
        dispose: null
      },
      {
        element: this.video.nativeElement,
        name: "contextmenu",
        callback: event => event.preventDefault(),
        dispose: null
      },
      {
        element: this.video.nativeElement,
        name: "timeupdate",
        callback: event => this.evTimeUpdate(event),
        dispose: null
      },
      {
        element: this.video.nativeElement,
        name: "ended",
        callback: event => this.ended.emit(),
        dispose: null
      },
      {
        element: this.player.nativeElement,
        name: "mousemove",
        callback: event => this.evMouseMove(event),
        dispose: null
      }
    ];

    this.video.nativeElement.onloadeddata = () => this.evLoadStatusChange(true);

    this.evt.addEvents(this._renderer, this.events);

    this.setVideoSrc(this.src);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.src) {
      this.setVideoSrc(this.src);
    }
  }

  ngOnDestroy(): void {
    this.video.nativeElement.onloadeddata = null;

    this.evt.removeEvents(this.events);
  }

  load(): void {
    if (this.video && this.video.nativeElement) {
      this.video.nativeElement.load();
    }
  }

  getVideoTag(): HTMLVideoElement | null {
    return this.video && this.video.nativeElement ? (this.video.nativeElement as HTMLVideoElement) : null;
  }

  evLoadStatusChange(isLoaded: boolean): void {
    this.videoLoaded = isLoaded;
    this.activeCCPiece = "";
  }

  evLoadedMetadata(event: any): void {
    this.videoWidth = this.video.nativeElement.videoWidth;
    this.videoHeight = this.video.nativeElement.videoHeight;
    this.evLoadStatusChange(true);
  }

  evMouseMove(event: any): void {
    this.isMouseMoving = true;
    clearTimeout(this.isMouseMovingTimer);
    this.isMouseMovingTimer = setTimeout(() => {
      this.isMouseMoving = false;
    }, this.isMouseMovingTimeout);
  }

  evTimeUpdate(event: any): void {
    this.time = this.getVideoTag().currentTime;
  }

  getOverlayClass(activeClass: string, inactiveClass: string): any {
      return !this.playing || this.isMouseMoving ? activeClass : inactiveClass;
  }

  private setVideoSrc(src: string | MediaStream | MediaSource | Blob): void {
    if (this.srcObjectURL) {
      URL.revokeObjectURL(this.srcObjectURL);
      this.srcObjectURL = null;
    }

    if (!this.video || !this.video.nativeElement) {
      return;
    }

    if (!src) {
      this.video.nativeElement.src = null;
      if ("srcObject" in HTMLVideoElement.prototype) {
        this.video.nativeElement.srcObject = new MediaStream();
      }
    } else if (typeof src === "string") {
      this.video.nativeElement.src = src;
    } else if ("srcObject" in HTMLVideoElement.prototype) {
      this.video.nativeElement.srcObject = src;
    } else {
      this.srcObjectURL = URL.createObjectURL(src);
      this.video.nativeElement.src = this.srcObjectURL;
    }

    this.video.nativeElement.muted = this.muted;
  }

  newPositionAsPercent(percentOffset: number) {
      this.isPercentInFlux = false; // signal that this.curTimePercent can again be updated when this.time is updated
      if (percentOffset >= 0 && percentOffset <= 100 && percentOffset != this.curTimePercent) {
          const video: HTMLVideoElement = this.getVideoTag();
          if (video)
            this.time = video.duration * (percentOffset / 100);
      }
  }

  notePercentIsInFlux() {
    // If video is playing and user starts manipulating slider, we do not want the slider via this.curTimePercent
    // to jump away from user control to where the video play head is.  Signal that the slider should be left alone,
    // i.e., that curTimePercent should be left alone, until the slider stabilizes (and newPositionAsPercent is called).
    this.isPercentInFlux = true; // this turns off updating of this.curTimePercent within this.time setter
  }

  actOnRewind() {
      var newPercentOffset = this.curTimePercent - this.OFFSET_FOR_FFWD_AND_REWIND;
      if (newPercentOffset < 0)
          newPercentOffset = 0;
      if (newPercentOffset < this.curTimePercent) {
          // Move back.
          this.isPercentInFlux = true;
          this.newPositionAsPercent(newPercentOffset);
      }
  }

  actOnFastForward() {
    var newPercentOffset = this.curTimePercent + this.OFFSET_FOR_FFWD_AND_REWIND;
    if (newPercentOffset > 100)
        newPercentOffset = 100;
    if (newPercentOffset > this.curTimePercent) {
        // Move ahead.
        this.isPercentInFlux = true;
        this.newPositionAsPercent(newPercentOffset);
    }
  }

  updateCCDisplayState(newState: boolean) {
    if (newState != this.currentCCDisplayState) {
      this.currentCCDisplayState = newState;
      this.userSettingsManagerService.updateCCText(newState); // save for the next video's use, too
      if (!newState)
          this.liveAnnouncer.clear(); // clear out CC text from announcer, too, when CC is hidden
    }
  }

  handleCueChange($event) {
    let cues = $event.target.track.activeCues;
    if (cues && cues.length && cues.length > 0) {
        // For this corpus, the length should always be 1, i.e., at most 1 timed text item active for any given time.
        // Say the first, which ideally is the "only"
        this.activeCCPiece = this.removeLeadin(cues[0].text);
        this.liveAnnouncer.announce(this.activeCCPiece); // as asked for by accessibility experts, announce the closed captioning
    }
  }

  removeLeadin(givenCueText): string {
      if (givenCueText && givenCueText.length && givenCueText.length > 0) {
        var cueText: string = givenCueText;
        if (cueText.search("<v") == 0) {
            // removing leading <v...> portion
            var legalStart: number = cueText.search(">");
            if (legalStart > 1)
                return cueText.substring(legalStart + 1); // return all that follows the <v..> piece
        }
        // Give up.  Echo back cueText and hope there is no special characters in it
        return cueText;
      }
      else
        return "";
  }
}

