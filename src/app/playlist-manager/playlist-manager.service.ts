import { Injectable } from '@angular/core';
import { Subject }    from 'rxjs/Subject';

import { Playlist } from './playlist';
import { Story } from '../storyset/story';

@Injectable()
export class PlaylistManagerService {
  // NOTE: "playlist" renamed to "my clips" in the UI and throughout much of the code, but not in the name of this service.
  // Also, "Playlist" left as the data type.  Local storage, for historic reasons/backward compatibility, keeps using "playlist"
  // as well.
  public myClips: Subject<Playlist[]> = new Subject<Playlist[]>();
  public myClips$ = this.myClips.asObservable();
  public presentMyClipsExportForm: Subject<boolean> = new Subject<boolean>();
  public presentMyClipsExportForm$ = this.presentMyClipsExportForm.asObservable();
  public presentMyClipsConfirmClearingForm: Subject<boolean> = new Subject<boolean>();
  public presentMyClipsConfirmClearingForm$ = this.presentMyClipsConfirmClearingForm.asObservable();

  public localMyClips: Playlist[] = [];

  constructor() {
      this.localMyClips = JSON.parse(localStorage.getItem("playlist") || "[]");
      this.myClips.next(this.localMyClips);
      this.initializeMyClips();
  }

  ngOnInit() {
      this.myClips.next(this.localMyClips);
  }

  initializeMyClips() {
      return this.localMyClips;
  }

  // !!!TODO: NOTE: UI to allow re-ordering of My Clips was retired rather than made fully accessible to keyboard-only users
  // (it formerly used a drag and drop interface brought in from elsewhere which was mouse-only driven), and so for
  // now this call is not used anywhere and hence is commented out:
  //updateMyClips(newMyClipsOrder: Playlist[]) {
  //    localStorage.setItem("playlist", JSON.stringify(newMyClipsOrder));
  //    this.localMyClips = newMyClipsOrder;
  //    this.myClips.next(this.localMyClips);
  //}

  clearMyClips() { // NOTE: ideally any caller to this first confirms with user before taking this clearing action
      localStorage.setItem("playlist", "[]");
      this.localMyClips = [];
      this.myClips.next(this.localMyClips);
  }

  triggerMyClipsExportForm() {
      // NOTE: Relying on a listener to changes in presentMyClipsExportForm to actually do the (modal) export form display.
      // Here we just signal it.
      this.presentMyClipsExportForm.next(true);
  }

  triggerMyClipsConfirmClearingForm() {
      // NOTE: Relying on a listener to changes in presentMyClipsConfirmClearingForm to actually do the (modal) confirm-clear form display.
      // Here we just signal it.
      this.presentMyClipsConfirmClearingForm.next(true);
  }

  toggleAddToMyClips(story) {
    var idx: number;
    var item: Playlist;

    idx = this.localMyClips.findIndex(x => x.storyID == story.storyID)
    if (idx >= 0) {
        // Remove story from list because it is already there
        this.localMyClips.splice(idx, 1);
        localStorage.setItem("playlist", JSON.stringify(this.localMyClips));
    }
    else {
        // Add story into the list because it is not yet there:
        item = {
            storyID: story.storyID,
            title: story.title
        }
        this.localMyClips.push(item); // append the item to the list
        // NOTE: if desired behavior is to prepend to the list, use this instead: this.localMyClips.unshift(item);
        localStorage.setItem("playlist", JSON.stringify(this.localMyClips));
    }
    this.myClips.next(this.localMyClips);
  }

  appendToMyClips(storyList: Story[]) {
      var idx: number;
      var item: Playlist;
      var atLeastOneAppendMade: boolean = false;
      if (storyList) {
          for (var i = 0; i < storyList.length; i++) {
              idx = this.localMyClips.findIndex(x => x.storyID == storyList[i].document.storyID);
              if (idx < 0) {
                  // Item not in My Clips; append it.
                  item = {
                      storyID: storyList[i].document.storyID,
                      title: storyList[i].document.title
                  }
                  this.localMyClips.push(item);
                  atLeastOneAppendMade = true;
              }
          }
          if (atLeastOneAppendMade)
              localStorage.setItem("playlist", JSON.stringify(this.localMyClips));
      }
  }

  MyClipsAsString(): string {
      var retVal: string = "";
      var favCount: number = this.localMyClips.length;
      if (favCount > 0) {
          retVal = this.localMyClips[0].storyID.toString();
          for (var i:number = 1; i < this.localMyClips.length; i++)
              retVal = retVal + "," + this.localMyClips[i].storyID;
      }
      return retVal;
  }

}
