import { Component, Input, OnChanges } from '@angular/core';
import { USMapDistribution } from './US-map-distribution';
import { USMapKeyColorBlock } from './US-map-key-color-block';
import { MapBucket } from './map-bucket';
import { GlobalState } from '../app.global-state';
import { USMapManagerService } from './US-map-manager.service';
import { FacetDetail } from '../historymakers/facet-detail';

@Component({
    selector: 'us-map',
    templateUrl: './us-map.component.html',
    styleUrls: ['./us-map.component.scss'],
})

// This class is used to present a United States map capable of having each of the 50 states plus D.C. color-coded (51 areas).
// Furthermore, it can show a key to describe the color-coding in place.
// See https://angular.io/guide/component-interaction as needed for more on component communication.
export class USMapComponent implements OnChanges {
    @Input() distributionToShow: USMapDistribution;

    public isMapInitialized: boolean = false;

    // Support interfaces for map text detail (accessibility improvement, i.e., text version of the map) hiding and scrolling
    isMapTextDetailShowing: boolean = false;
    toggleMapTextDetailLabel: string = "Show Text Details";
    mapTextDetailBlock: string;
    mapSeeContentsHelperInfo: string = "";

    regionUSStateInsideMapFacets: FacetDetail[] = []; // used to allow screen reader users to select a region from a list, instead of visually from the svg map

    public excuseOnExistingFilterRegions: string = ""; // used in the html template

    mapDistributionListOpened: boolean = true; // accessibility experts asked to have list initially opened (list needed, since map is tagged aria-hidden="true")

    // FYI: 7-color scheme derived from ColorBrewer:
    // http://colorbrewer2.org/#type=sequential&scheme=Oranges&n=7
    // FYI: see advice at https://blog.datawrapper.de/choroplethmaps/
    // NOTE: Colors quickly checked to pass WCAG AA normal text at https://webaim.org/resources/contrastchecker/
    // NOTE: decided that first entry (fill grayscale #dedede and foreground black) best to indicate no data as a default.
    private myBackgroundColorKey:string[] = [
      "#dedede", "#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"
    ];
    private myForegroundColorKey:string[] = [
      "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#ffffff"
    ];

    public fC:string[] = []; // fill color for region
    public sC:string[] = []; // stroke color for region

    private keyColorBlock:USMapKeyColorBlock[] = [];

    constructor(private globalState: GlobalState, private myUSMapManagerService: USMapManagerService) {
        // Initialize fC and sC as being indexed from 1 to 51 with 0 saved for nothing/null/out-of-bounds,
        // and [1,51] mapping to state abbreviations ordered alphabetically for 50 states plus DC,
        // e.g., 1 is AK, 2 is AL, 3 is AR, ..., 8 is DC, ..., 35 is NY, ..., 51 is WY.
        this.fC.push(this.myBackgroundColorKey[0]);
        this.sC.push(this.myForegroundColorKey[0]);

        for (var i:number = 1; i <= 51; i++) {
            this.fC.push(this.myBackgroundColorKey[0]);
            this.sC.push(this.myForegroundColorKey[0]);
        }

        this.keyColorBlock = [];
        var oneColorBlock:USMapKeyColorBlock
        for (var i:number = 0; i < this.myBackgroundColorKey.length; i++) {
            oneColorBlock = new USMapKeyColorBlock();
            oneColorBlock.fill = this.myBackgroundColorKey[i];
            oneColorBlock.regionCount = 0; // signalling it is not in use (yet)
            this.keyColorBlock.push(oneColorBlock);
        }
        this.mapTextDetailBlock = "";
        this.isMapInitialized = true;
    }

    ngOnChanges() {
        // NOTE: based on change to distributionToShow, update how map is displayed:
        // (1) Key title and other changes, mapped directly into the view from distributionToShow, but adjusting the preface on key color blocks
        //     based on the striping of the data distribution to the color blocks.
        // (2) Map distributions into color ranges to assign value of 0 to 7 to the data.

        if (this.distributionToShow == null || this.distributionToShow.count == null)
            return; // do nothing without a distribution

        var minBucketCount:number = 0;
        var maxBucketCount:number = 0;
        var bNonMaximumPositiveValueEncountered:boolean = false;
        for (var i:number = 0; i < this.distributionToShow.count.length; i++) {
            if (this.distributionToShow.count[i] > maxBucketCount) {
                if (!bNonMaximumPositiveValueEncountered && maxBucketCount > 0)
                bNonMaximumPositiveValueEncountered = true; // had a positive max, and it changed out, so we have a positive non-max value
                maxBucketCount = this.distributionToShow.count[i];
            }
            else if (!bNonMaximumPositiveValueEncountered && this.distributionToShow.count[i] > 0)
                bNonMaximumPositiveValueEncountered = true; // had a nonzero max, and this value is positive but less than that max, so we have a positive non-max value
            if (minBucketCount == 0 || this.distributionToShow.count[i] < minBucketCount)
                minBucketCount = this.distributionToShow.count[i];
        }

        // Rules for color assignment:
        // (A) Always reserve index 0 SOLELY for zero counts.  (Perhaps it may be unneeded, i.e., a data set stripes across all 51 states+DC entries, but still hold it out.)
        // (B) For counts MIN to MAX, could do a quick check of semi-logarithmic vs. linear buckets for the classed map.  There are 7 "classes" and we know MIN and MAX.
        // Perhaps we need to know more about the input data to make that judgment.  Work is !!!TBD!!!  Here, we start with always taking linear bucketing.
        var linearBlock:MapBucket[] = [];
        var linearStep:number = (maxBucketCount - minBucketCount) / (this.myBackgroundColorKey.length - 1); // likely to be fractional, of course
        var workingMin: number;
        var oneBucket:MapBucket = new MapBucket();
        oneBucket.minValue = 0;
        oneBucket.maxValue = 0;
        oneBucket.regionCount = 0;
        linearBlock.push(oneBucket); // Always reserve index 0 SOLELY for zero counts.
        if (maxBucketCount > 0) {
            // Continue with data that has at least one non-zero value...

            if (!bNonMaximumPositiveValueEncountered) {
                // An edge case (e.g., happens when filtering to a birth state for biographies) - only one count is in the data: the max count.
                oneBucket = new MapBucket();
                oneBucket.regionCount = 0;
                oneBucket.minValue = maxBucketCount;
                oneBucket.maxValue = maxBucketCount;
                linearBlock.push(oneBucket);
            }
            else { // set up buckets across the range
                workingMin = minBucketCount;
                if (workingMin == 0)
                    workingMin++; // already have value 0 count tied to block at index 0 of linearBlock
                for (var i:number = 1; i < this.myBackgroundColorKey.length; i++) {
                    oneBucket = new MapBucket();
                    oneBucket.regionCount = 0;
                    oneBucket.minValue = Math.floor(workingMin);
                    workingMin += linearStep;
                    if (i < this.myBackgroundColorKey.length - 1)
                        oneBucket.maxValue = Math.floor(workingMin); // NOTE: it's OK if this is same as minValue for linearStep < 1
                    else
                        oneBucket.maxValue = maxBucketCount;
                    linearBlock.push(oneBucket);

                    workingMin = oneBucket.maxValue + 1; // always move next bucket past the prior one
                    if (workingMin > maxBucketCount) {
                        // Skip out on remaining buckets as we will not be using them - they are unneeded (because min to max range was so narrow).
                        break;
                    }
                }
            }
        }
        // else everything maps to bucket 0 for "0" i.e., no regions have non-zero counts

        // Now run through linear blocks, using their ranges to assign to corresponding key color blocks.
        // NOTE: we may not use all 8 key color blocks (one for zero count data, the others for non-zero data).
        // NOTE: if range is N-N with same number N, then just report as N, and if that is 1, adjust preface to use singular form.
        var givenCount:number;
        var blockID:number = -1;

        // Don't worry about the items not mapping to a region at this.distributionToShow.count[0] so start with index 1...
        var whichBlock:number[] = [];
        whichBlock.push(0); // this is for region 0, really a no-op to keep future assignments lined up...

        for (var regionID:number = 1; regionID < this.distributionToShow.count.length; regionID++) {
            givenCount = this.distributionToShow.count[regionID];
            if (givenCount == 0) {
                blockID = 0; // use block 0, reserved for 0 counts
            }
            else {
                blockID = 1;
                while (blockID < linearBlock.length - 1) {
                    if (givenCount <= linearBlock[blockID].maxValue) {
                        break; // this is the block for this range
                    }
                    blockID++;
                }
                // Note: logic above defaults to blockID == linearBlock.length - 1 if no matches made to earlier blocks.
            }
            linearBlock[blockID].regionCount++;
            whichBlock.push(blockID);
        }

        // Now, see how many colors we are using.  One color is the "zero color" meant only to show 0 (which is linearBlock[0])
        var otherColorsCount:number = 0;
        for (var blockCounter = 1; blockCounter < linearBlock.length; blockCounter++) {
            if (linearBlock[blockCounter].regionCount > 0)
                otherColorsCount++;
        }
        var colorIndexInUse:number[] = [];
        // Some logic here on which colors to keep from our master set
        // Master set is "#dedede", "#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04" for
        // zero-color, lightest-background, lighter-bkgd, light-bkgd, dark-bkgd, darker-bkgd, near-darkest-bkgd, darkest-background
        // index 0, 1, 2, 3, 4, 5, 6, 7 with 0 held out for zeroColorInUse slot
        switch (otherColorsCount) {
            case 0:
                break; // nothing to do, no colors
            case 1:
                colorIndexInUse.push(7); // use darkest-background
                break;
            case 2:
                colorIndexInUse.push(2); // use light-bkgd
                colorIndexInUse.push(7); // use darkest-background
                break;
            case 3:
                colorIndexInUse.push(2); // use light-bkgd
                colorIndexInUse.push(4); // use dark-bkgd
                colorIndexInUse.push(7); // use darkest-background
                break;

            case 4:
                colorIndexInUse.push(1); // use lightest-background
                colorIndexInUse.push(3); // use light-bkgd
                colorIndexInUse.push(5); // use darker-bkgd
                colorIndexInUse.push(7); // use darkest-background
                break;

            case 5:
                colorIndexInUse.push(1); // use lightest-background
                colorIndexInUse.push(3); // use light-bkgd
                colorIndexInUse.push(4); // use dark-bkgd
                colorIndexInUse.push(5); // use darker-bkgd
                colorIndexInUse.push(7); // use darkest-background
                break;

            case 6:
                colorIndexInUse.push(1); // use lightest-background
                colorIndexInUse.push(3); // use light-bkgd
                colorIndexInUse.push(4); // use dark-bkgd
                colorIndexInUse.push(5); // use darker-bkgd
                colorIndexInUse.push(6); // use near-darkest-bkgd
                colorIndexInUse.push(7); // use darkest-background
                break;

            case 7:
                colorIndexInUse.push(1); // use lightest-background
                colorIndexInUse.push(2); // use lighter-bkgd
                colorIndexInUse.push(3); // use light-bkgd
                colorIndexInUse.push(4); // use dark-bkgd
                colorIndexInUse.push(5); // use darker-bkgd
                colorIndexInUse.push(6); // use near-darkest-bkgd
                colorIndexInUse.push(7); // use darkest-background
                break;
        }
        // Assign color IDs to the non-zero blocks (i.e., start at index 1, and set an index "colorID" into colorIndexInUse)
        // Also, reset the map key and its color blocks.
        for (var i:number = 0; i < this.myBackgroundColorKey.length; i++) {
            this.keyColorBlock[i].regionCount = 0;
        }

        var colorIndex:number = 0;
        if (linearBlock[0].regionCount > 0) {
            this.keyColorBlock[0].regionCount = linearBlock[0].regionCount;
            this.keyColorBlock[0].preface = "0 " + this.distributionToShow.keyEntityPlural; // have some zero-entry regions
        }

        for (var blockCounter = 1; blockCounter < linearBlock.length; blockCounter++) {
            if (linearBlock[blockCounter].regionCount > 0) {
                this.keyColorBlock[blockCounter].regionCount = linearBlock[blockCounter].regionCount;

                // Set the fill color.
                this.keyColorBlock[blockCounter].fill = this.myBackgroundColorKey[colorIndexInUse[colorIndex]];

                // Save index to this fill color for use in coloring regions (see this.fC assignment below).
                linearBlock[blockCounter].colorID = colorIndex++;

                // Also, set the map key.
                if (linearBlock[blockCounter].minValue == linearBlock[blockCounter].maxValue) {
                    if (linearBlock[blockCounter].minValue == 1)
                        this.keyColorBlock[blockCounter].preface = "1 " + this.distributionToShow.keyEntitySingular;
                    else
                        this.keyColorBlock[blockCounter].preface = linearBlock[blockCounter].minValue + " " + this.distributionToShow.keyEntityPlural;
                }
                else {
                    this.keyColorBlock[blockCounter].preface = linearBlock[blockCounter].minValue + "-" + linearBlock[blockCounter].maxValue + " " + this.distributionToShow.keyEntityPlural;
                }
            }
        }
        // Now with colors set for the map based on how region counts line up with color distribution buckets, assign region colors
        // As above, start regionID index range of concern at 1 (since 0 saved for the no-region-matches information)
        for (var regionID:number = 1; regionID < this.distributionToShow.count.length; regionID++) {
            givenCount = this.distributionToShow.count[regionID];
            if (givenCount == 0) { // use zero color, reserved for 0 counts
                this.fC[regionID] = this.myBackgroundColorKey[0];
                this.sC[regionID] = this.myForegroundColorKey[0];
            }
            else {
                // We saved which block is for this region in whichBlock during an earlier traversal.
                // We saved the color index into colorIndexInUse (a subset perhaps of all the colors we have in myBackgroundColorKey and myForegroundColorKey),
                // via linearBlock's colorID attribute.
                // We use colorIndexInUse to index into myBackgroundColorKey and myForegroundColorKey.
                this.fC[regionID] = this.myBackgroundColorKey[colorIndexInUse[linearBlock[whichBlock[regionID]].colorID]];
                this.sC[regionID] = this.myForegroundColorKey[colorIndexInUse[linearBlock[whichBlock[regionID]].colorID]];
            }
        }

        // Lastly, set up the list of regions, for use by those who may not be able to see or interact with the map view.
        this.initializeListOfRegions();

        // Provide excuse as needed if some regions already in the known filter (i.e., this interface ADDS to filter, but does not reset it or clear from it; other UI exists for that).
        if (this.distributionToShow.regionIDsAlreadyInFilter && this.distributionToShow.regionIDsAlreadyInFilter.length > 0) {
            var filteredRegionIDs: string[] = this.distributionToShow.regionIDsAlreadyInFilter.split(",");
            if (filteredRegionIDs.length == 1)
                this.excuseOnExistingFilterRegions = "State already selected: " + this.distributionToShow.regionIDsAlreadyInFilter;
            else
                this.excuseOnExistingFilterRegions = "States already selected: " + this.distributionToShow.regionIDsAlreadyInFilter;
        }
        else
            this.excuseOnExistingFilterRegions = "";

        // Computer helper line.
        this.mapSeeContentsHelperInfo = "To access list of " + this.distributionToShow.keyEntityPlural + ", switch to the Picture Stamp Grid or Text-only Grid view."

        // Compute, or finish computing, the text version of the map.
        // Give up on strange error cases of no data or bad data.
        if (linearBlock && linearBlock.length > 0)
            this.mapTextDetailBlock = this.computeMapTextDetailInformation(linearBlock, whichBlock);
        else
            this.mapTextDetailBlock = "";
    }

    appendedCountToValue(givenValue: string, givenCount: number): string {
        return givenValue + ", " + givenCount;
    }

    private computeMapTextDetailInformation(givenBucket: MapBucket[], mappingToGroup: number[]) : string {
      var workDetail: string;

      if (this.distributionToShow.keyEntitySetCount == 1)
          workDetail = "There is 1 " + this.distributionToShow.keyEntitySingular + " in this set.  This 1 " +
           this.distributionToShow.keyEntitySingular + " " + this.distributionToShow.verbLeadInSingular + " U.S. states as follows:<br>"
      else
          workDetail = "There are " + this.distributionToShow.keyEntitySetCount + " " +
          this.distributionToShow.keyEntityPlural + " in this set.  These " + this.distributionToShow.keyEntitySetCount + " " +
          this.distributionToShow.keyEntityPlural + " " + this.distributionToShow.verbLeadIn + " U.S. states as follows:<br>";

      var bucketsWithData: number = 0;
      // Specific format for givenBucket, with givenBucket[0] used for those U.S. states with nothing in the set so skip first index  of 0 here:
      for (var groupIndex: number = givenBucket.length - 1; groupIndex > 0; groupIndex--) {
          if (givenBucket[groupIndex].regionCount > 0) {
              workDetail += this.distributionToShow.verbPhrase + " " + givenBucket[groupIndex].minValue;
              if (givenBucket[groupIndex].minValue < givenBucket[groupIndex].maxValue)
                  workDetail += " to " + givenBucket[groupIndex].maxValue + " " + this.distributionToShow.keyEntityPlural + ": ";
              else if (givenBucket[groupIndex].minValue == 1)
                  workDetail += " " + this.distributionToShow.keyEntitySingular + ": ";
              else
                  workDetail += " " + this.distributionToShow.keyEntityPlural + ": ";
              workDetail += this.stateListInGivenRange(groupIndex, mappingToGroup) +
                "<br>";
              bucketsWithData++;
          }
      }
      if (bucketsWithData != 1)
          workDetail += "<br>The above " + bucketsWithData + " groupings correspond to the " + bucketsWithData +
            " colors used in the color-coded map";
      else // special case for 1 color
          workDetail += "<br>The above 1 grouping corresponds to the 1 color used in the color-coded map";
      if (givenBucket[0].regionCount > 0) // yes, there are some uncolored "gray" U.S. states so note that at very end of the detail
          workDetail += " (with the remaining states given a separate grayscale hue)";
      workDetail += ".";
      return workDetail;

      // Construct a format like the following, for whatever the this.distributionToShow.keyEntityPlural and other entries are, with two
      // most likely being:
      // this.distributionToShow.keyEntityPlural as "stories"
      // this.distributionToShow.verbLeadIn as "discuss"
      // this.distributionToShow.verbPhrase as "Discussed in" (for stories, of course), or else:
      // this.distributionToShow.keyEntityPlural as "HistoryMakers"
      // this.distributionToShow.verbLeadIn as "are born in"
      // this.distributionToShow.verbPhrase as "Birthplace of" (for biographies, of course)
      // Example:
      // There are 67 stories in this set.
      // These 67 stories discuss U.S. states as follows:
      // Discussed in 16 or more stories:  New York (17 stories); Illinois (18 stories, the most)
      // Discussed in 10 to 12 stories:  District of Columbia (10 stories)
      // Discussed in 7 to 9 stories:  Michigan, Massachusetts (7 stories)
      // Discussed in 4 to 6 stories:  Colorado, Florida, Michigan, North Carolina, Washington (4 stories); Tennessee, Virginia (5 stories); Ohio, Pennsylvania (6 stories)
      // Discussed in 1 to 3 stories: ... (fill in of course)
      //
      // The above 5 groupings correspond to the 5 colors used in the color-coded map (with the remaining states given a separate grayscale hue).

    }

    private stateListInGivenRange(currentGroup: number, mappingToGroup: number[]) : string {
      var workVal: string = "";
      for (var i: number = 0; i < 51; i++) {
          if (mappingToGroup[i] == currentGroup)
              workVal += this.globalState.USStateNameFromNumber(i) + ", ";
      }
      if (workVal.length > 0)
          workVal = workVal.substring(0, workVal.length - 2); // remove final spurious ", "
      return workVal;
    }

    private considerRegionForList(readableName: string, twoLetterID: string) {
        // NOTE:  caller already verified that this.distributionToShow and this.distributionToShow.count are not null.
        var numericIndexForMap:number;
        var countForThisRegion:number;
        var oneFacetDetail:FacetDetail;
        if ((this.distributionToShow.regionIDsAlreadyInFilter == null) ||
          this.distributionToShow.regionIDsAlreadyInFilter.indexOf(twoLetterID) == -1) {
            // This region is not already in the filter.  Consider it for selection by the user.
            numericIndexForMap = this.globalState.MapIndexForUSState(twoLetterID);
            countForThisRegion = this.distributionToShow.count.length > numericIndexForMap? this.distributionToShow.count[numericIndexForMap] : 0;
            if (countForThisRegion > 0) {
                  oneFacetDetail = new FacetDetail();
                  oneFacetDetail.ID = twoLetterID;
                  oneFacetDetail.value = readableName;
                  oneFacetDetail.count = countForThisRegion;
                  this.regionUSStateInsideMapFacets.push(oneFacetDetail);
            }
        }
    }

    private initializeListOfRegions() {
        this.regionUSStateInsideMapFacets = [];
        if (this.distributionToShow == null || this.distributionToShow.count == null)
            return; // do nothing further without a distribution

        // In alphabetic order by full US state (or D.C.) name, create the list for entries that have non-zero counts.  Leave off those with zero counts.
        this.considerRegionForList("Alabama", "AL");
        this.considerRegionForList("Alaska", "AK");
        this.considerRegionForList("Arizona", "AZ");
        this.considerRegionForList("Arkansas", "AR");
        this.considerRegionForList("California", "CA");
        this.considerRegionForList("Colorado", "CO");
        this.considerRegionForList("Connecticut", "CT");
        this.considerRegionForList("Delaware", "DE");
        this.considerRegionForList("District of Columbia", "DC");
        this.considerRegionForList("Florida", "FL");
        this.considerRegionForList("Georgia", "GA");
        this.considerRegionForList("Hawaii", "HI");
        this.considerRegionForList("Idaho", "ID");
        this.considerRegionForList("Illinois", "IL");
        this.considerRegionForList("Indiana", "IN");
        this.considerRegionForList("Iowa", "IA");
        this.considerRegionForList("Kansas", "KS");
        this.considerRegionForList("Kentucky", "KY");
        this.considerRegionForList("Louisiana", "LA");
        this.considerRegionForList("Maine", "ME");
        this.considerRegionForList("Maryland", "MD");
        this.considerRegionForList("Massachusetts", "MA");
        this.considerRegionForList("Michigan", "MI");
        this.considerRegionForList("Minnesota", "MN");
        this.considerRegionForList("Mississippi", "MS");
        this.considerRegionForList("Missouri", "MO");
        this.considerRegionForList("Montana", "MT");
        this.considerRegionForList("Nebraska", "NE");
        this.considerRegionForList("Nevada", "NV");
        this.considerRegionForList("New Hampshire", "NH");
        this.considerRegionForList("New Jersey", "NJ");
        this.considerRegionForList("New Mexico", "NM");
        this.considerRegionForList("New York", "NY");
        this.considerRegionForList("North Carolina", "NC");
        this.considerRegionForList("North Dakota", "ND");
        this.considerRegionForList("Ohio", "OH");
        this.considerRegionForList("Oklahoma", "OK");
        this.considerRegionForList("Oregon", "OR");
        this.considerRegionForList("Pennsylvania", "PA");
        this.considerRegionForList("Rhode Island", "RI");
        this.considerRegionForList("South Carolina", "SC");
        this.considerRegionForList("South Dakota", "SD");
        this.considerRegionForList("Tennessee", "TN");
        this.considerRegionForList("Texas", "TX");
        this.considerRegionForList("Utah", "UT");
        this.considerRegionForList("Vermont", "VT");
        this.considerRegionForList("Virginia", "VA");
        this.considerRegionForList("Washington", "WA");
        this.considerRegionForList("West Virginia", "WV");
        this.considerRegionForList("Wisconsin", "WI");
        this.considerRegionForList("Wyoming", "WY");
    }

    toggleRegionUSStateFacet(chosenFacet: FacetDetail) {
      this.onMapClick(chosenFacet.ID);
    }

    onMapClick(regionAcronym: string) {
        if (this.distributionToShow == null || this.distributionToShow.count == null)
            return; // do nothing without a distribution

        if ((this.distributionToShow.regionIDsAlreadyInFilter == null) ||
            this.distributionToShow.regionIDsAlreadyInFilter.indexOf(regionAcronym) == -1) {
            // This particular region is not already in the filter, so make note of a click on it.
            var numericIndexForMap:number = this.globalState.MapIndexForUSState(regionAcronym); // use 12 instead of "HI"
            if (this.distributionToShow.count.length > numericIndexForMap && this.distributionToShow.count[numericIndexForMap] > 0) {
                this.myUSMapManagerService.makeNoteOfClickedRegionID(regionAcronym);
            }
        }
    }

    toggleMapTextDetailDisplay() {
        this.isMapTextDetailShowing = !this.isMapTextDetailShowing;
        if (this.isMapTextDetailShowing) {
            this.toggleMapTextDetailLabel = "Hide Text Details";
        }
        else {
            this.toggleMapTextDetailLabel = "Show Text Details";
        }
    }
}
