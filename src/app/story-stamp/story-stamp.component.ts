import { Component, Input } from '@angular/core';

import { StoryDocument } from '../storyset/story-document';
import { StoryHighlight } from '../storyset/story-highlight';
import { environment } from '../../environments/environment';

import { BaseComponent } from '../shared/base.component';

@Component({
    selector: 'thda-story',
    templateUrl: './story-stamp.component.html',
    styleUrls: ['./story-stamp.component.scss']
})

// This class is used to present a single story in a presumed grid/list of stories.
// It takes as input the story details in the form of a StoryDocument object, and the ID of whatever story might be
// selected to appropriately focus the selected story in a grid/list.
export class StoryStampComponent extends BaseComponent {
    @Input() story: StoryDocument;
    @Input() highlights: StoryHighlight;
    @Input() hideInterviewDate:boolean = false;
    @Input() overrideToH4Nesting:boolean = false;
    @Input('selectedID') selectedStoryID: number;
    @Input() cardView: boolean;
    @Input() queryForTranscript: string; // used to preserve query-into-transcript context for later match term lookup by a detailed story renderer

    public myMediaBase: string;

    constructor() {

        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)

        this.myMediaBase = environment.mediaBase;
    }

    qualifiedRoute() : string {
        if (this.story && this.story.storyID)
            return '/story/' + this.story.storyID; // the correct route
        else
            return '/story/0'; // default bogus path
    }

    isSelected(oneStoryID: number) {
        return oneStoryID == this.selectedStoryID;
    }

    // Return a mm:ss format equivalent to the specified number of milliseconds, dropping out fractional part
    // and returning 0:ss for values under a minute.  Return 0:00 for negative values or 0, and
    // impose a ceiling of 99:59 for huge values.
    convertToMMSS(givenVal: number): string {
        const MAX_MILLISECS_SUPPORTED = 5999; // 99 minutes and 59 seconds, 99:59
        var workVal = Math.floor(givenVal / 1000); // convert milliseconds to seconds
        // Protect for goofy values:
        if (workVal < 0)
            workVal = 0;
        else if (workVal > MAX_MILLISECS_SUPPORTED)
            workVal = MAX_MILLISECS_SUPPORTED;
        var minutes = Math.floor(workVal / 60);
        var seconds = workVal - (60 * minutes);
        var minutesString: string = minutes.toString();
        var secondsString: string = seconds.toString();
        if (secondsString.length == 1)
            secondsString = "0" + secondsString;
        return minutesString + ":" + secondsString;
    }

    // Return the given string, unless it is too long, then return a shortened form ended with ...
    // NOTE: new manner of showing title will often crop long titles out of view without user able to see
    // the truncation cue of "..." but the advantage is we are not showing extra lines of space for most results
    // in order to show the ending ... line for a few (which was true even when max-allowable-length was 80).
    truncatedAsNeeded(givenString: string): string {
        var validatedString: string = givenString;
        const MAX_ALLOWABLE_LENGTH = 160;
        if (validatedString != null && validatedString.length > MAX_ALLOWABLE_LENGTH) {
            var lastIndex = givenString.lastIndexOf(' ', MAX_ALLOWABLE_LENGTH - 3);
            if (lastIndex < 0)
                // Could not find a space to break on, so just keep first MAX_ALLOWABLE_LENGTH - 3 characters
                lastIndex = MAX_ALLOWABLE_LENGTH - 2;
            validatedString = givenString.substring(0, lastIndex) + "...";
        }
        return validatedString;
    }

    makeDatePretty(givenDate: string): string {
        var month: string = "";
        var monthAsNumber: number;
        var day: string;

        if (givenDate != null && givenDate.length >= 10) {
            // NOTE:  Date form starts yyyy-mm-dd
            monthAsNumber = +givenDate.substr(5, 2);
            switch (monthAsNumber) {
                case 1: month = "Jan."; break;
                case 2: month = "Feb."; break;
                case 3: month = "Mar."; break;
                case 4: month = "Apr."; break;
                case 5: month = "May"; break;
                case 6: month = "June"; break;
                case 7: month = "July"; break;
                case 8: month = "Aug."; break;
                case 9: month = "Sep."; break;
                case 10: month = "Oct."; break;
                case 11: month = "Nov."; break;
                case 12: month = "Dec."; break;
            }
            if (givenDate.substr(8, 1) == "0")
                day = givenDate.substr(9, 1); // drop leading zero
            else
                day = givenDate.substr(8, 2);
            return month + " " + day + ", " + givenDate.substr(0, 4);
        }
        else
            return ""; // give up on bad input data
    }
}
