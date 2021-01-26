import { Injectable } from '@angular/core';
import { TagService } from './tag.service';
import { Observable } from "rxjs/Observable";
import { ChosenTagInfo } from './chosen-tag-info';

@Injectable()
export class TagChosenSetService {
    // Internal record of the chosen tag set:
    private thdaChosenTags: ChosenTagInfo[];

    // Internal record of the tags as readable string (exposed via read-only property description):
    private myDescription: string;

    // Internal record of the tags as short parseable string (exposed via read-only property tagSpec):
    private myTagSpec: string;

    // Indicator that the set of items in the tag set changed
    private refreshNeededForTags: boolean;

    constructor(private tagService: TagService) {
        this.thdaChosenTags = [];

        this.clear(); // initially everything is in cleared out state
    }

    get chosenTags(): ChosenTagInfo[] {
        return this.thdaChosenTags;
    }
    public addTagChoice(id: string, branchIndex: number, leafIndex: number, label: string) {
        if (this.indexOfID(id) < 0) {
            this.thdaChosenTags.push(new ChosenTagInfo(branchIndex, leafIndex, id, label));
            this.refreshNeededForTags = true;
        }
    }
    public removeTagChoice(id: string) {
        var index = this.indexOfID(id);
        if (index > -1) {
            this.thdaChosenTags.splice(index, 1);
            this.refreshNeededForTags = true;
        }
    }

    private indexOfID(givenID: string): number {
        var retVal: number = -1;

        for (var i = 0; i < this.thdaChosenTags.length; i++) {
            if (this.thdaChosenTags[i].id == givenID) {
                retVal = i;
                break;
            }
        }
        return retVal;
    }

    public clear() {
        this.thdaChosenTags = [];
        this.myDescription = "";
        this.myTagSpec = "";
        this.refreshNeededForTags = false;
    }

    public tagMatchCount(): Observable<number> {
        // Returns the number of stories meeting the current tag choice setting.
        return this.tagService.getTagSearchCount(this.myTagSpec);
    }

    // Read-only property that is the string specification of the tag filter.
    get tagSpec(): string {
        this.updateTagStateForOthers();
        return this.myTagSpec;
    }

    // Read-only property that is a readable description of the chosen tags.
    get description(): string {
        this.updateTagStateForOthers();
        return this.myDescription;
    }

    private updateTagStateForOthers() {
        // When callers want the description and/or tag specification reflecting
        // settings of this.thdaTag, this routine is called to update such descriptors
        // (one readable, i.e., description; and one brief but parseable, i.e., tagSpec).

        if (this.refreshNeededForTags) {
            if (this.thdaChosenTags.length > 0) {
                var descriptionSetLabel: string = this.thdaChosenTags[0].label;
                var tagSetLabel: string = this.thdaChosenTags[0].id;
                for (var i = 1; i < this.thdaChosenTags.length; i++) {
                    descriptionSetLabel += ", " + this.thdaChosenTags[i].label;
                    tagSetLabel += "," + this.thdaChosenTags[i].id;
                }
                this.myDescription = descriptionSetLabel;
                this.myTagSpec = tagSetLabel;
            }
            else {
                this.myDescription = "";
                this.myTagSpec = "";
            }
            this.refreshNeededForTags = false;
        }
    }
}
