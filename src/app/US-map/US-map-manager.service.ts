import { Injectable } from '@angular/core';
import { Subject }    from 'rxjs/Subject';

// The purpose of this service is to store as an observable information from the U.S. map,
// such as which U.S. region has been clicked.
@Injectable()
export class USMapManagerService {
  public clickedRegionID: Subject<string> = new Subject<string>();
  public clickedRegionID$ = this.clickedRegionID.asObservable();
  constructor() {
  }

  ngOnInit() {
  }

  makeNoteOfClickedRegionID(givenClickedRegionID) {
    this.clickedRegionID.next(givenClickedRegionID);
  }
}
