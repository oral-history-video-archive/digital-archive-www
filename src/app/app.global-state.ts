import { Injectable } from '@angular/core';
import { SearchResult } from './storyset/search-result';

@Injectable()
export class GlobalState {

    NOTHING_CHOSEN: number = -1; // indicates a null choice, an empty choice, as "real" IDs will have values >= 0
    NO_ACCESSION_CHOSEN: string = ""; // indicates a null choice, an empty choice, as "real" accession IDs will be non-empty

    SearchTitleOnly: boolean = false; // if true, queries to stories will be targeted only to the story title field
    SearchTranscriptOnly: boolean = false; // if true, queries to stories will be targeted only to the transcript field

    BiographyPageSize: number = 100;
    StoryPageSize: number = 30;

    BiographySearchSortingPreference: number = 0;
    StorySearchSortingPreference: number = 0;

    BiographySearchLastNameOnly: boolean = false; // if true, queries to biography will be targeted only to the last name field
    BiographySearchPreferredNameOnly: boolean = false; // if true, queries to biography will be targeted only to the preferred name field

    // Make public the bit fields corresponding to the makeup for the bioSearchFieldsMask setting.
    public readonly BiographySearchAccession_On: number = 1;
    public readonly BiographySearchDescriptionShort_On: number = 2;
    public readonly BiographySearchBiographyShort_On: number = 4;
    public readonly BiographySearchFirstName_On: number = 8;
    public readonly BiographySearchLastName_On: number = 16;
    public readonly BiographySearchPreferredName_On: number = 32;

    MALE_MARKER: string = "Male";
    FEMALE_MARKER: string = "Female";

    FEMALE_ID: string = "0";
    MALE_ID: string = "1";

    matchSetContext: SearchResult;

    PageSizeCandidates: number[] = [10, 30, 60, 100, 300];

    WithinSPARoutingAlready: boolean = false; // used to check if SPA is past its first page/route (with this as value false to start off as "no, not yet...")
    IsInternalRoutingWithinSPA: boolean = false; // used for focus control on SPA (single page application) routing

    NameForUSState(givenState2LetterAbbrev: string):string {
        var retVal:string = "";

        switch (givenState2LetterAbbrev) {
            case "AK": 	retVal = "Alaska"; break;
            case "AL": 	retVal = "Alabama"; break;
            case "AR": 	retVal = "Arkansas"; break;
            case "AZ": 	retVal = "Arizona"; break;
            case "CA": 	retVal = "California"; break;
            case "CO": 	retVal = "Colorado"; break;
            case "CT": 	retVal = "Connecticut"; break;
            case "DC": 	retVal = "District of Columbia"; break;
            case "DE": 	retVal = "Delaware"; break;
            case "FL": 	retVal = "Florida"; break;
            case "GA": 	retVal = "Georgia"; break;
            case "HI": 	retVal = "Hawaii"; break;
            case "IA": 	retVal = "Iowa"; break;
            case "ID": 	retVal = "Idaho"; break;
            case "IL": 	retVal = "Illinois"; break;
            case "IN": 	retVal = "Indiana"; break;
            case "KS": 	retVal = "Kansas"; break;
            case "KY": 	retVal = "Kentucky"; break;
            case "LA": 	retVal = "Louisiana"; break;
            case "MA": 	retVal = "Massachusetts"; break;
            case "MD": 	retVal = "Maryland"; break;
            case "ME": 	retVal = "Maine"; break;
            case "MI": 	retVal = "Michigan"; break;
            case "MN": 	retVal = "Minnesota"; break;
            case "MO": 	retVal = "Missouri"; break;
            case "MS": 	retVal = "Mississippi"; break;
            case "MT": 	retVal = "Montana"; break;
            case "NC": 	retVal = "North Carolina"; break;
            case "ND": 	retVal = "North Dakota"; break;
            case "NE": 	retVal = "Nebraska"; break;
            case "NH": 	retVal = "New Hampshire"; break;
            case "NJ": 	retVal = "New Jersey"; break;
            case "NM": 	retVal = "New Mexico"; break;
            case "NV": 	retVal = "Nevada"; break;
            case "NY": 	retVal = "New York"; break;
            case "OH": 	retVal = "Ohio"; break;
            case "OK": 	retVal = "Oklahoma"; break;
            case "OR": 	retVal = "Oregon"; break;
            case "PA": 	retVal = "Pennsylvania"; break;
            case "RI": 	retVal = "Rhode Island"; break;
            case "SC": 	retVal = "South Carolina"; break;
            case "SD": 	retVal = "South Dakota"; break;
            case "TN": 	retVal = "Tennessee"; break;
            case "TX": 	retVal = "Texas"; break;
            case "UT": 	retVal = "Utah"; break;
            case "VA": 	retVal = "Virginia"; break;
            case "VT": 	retVal = "Vermont"; break;
            case "WA": 	retVal = "Washington"; break;
            case "WI": 	retVal = "Wisconsin"; break;
            case "WV": 	retVal = "West Virginia"; break;
            case "WY": 	retVal = "Wyoming"; break;
        }
        return retVal;
    }

    MapIndexForUSState(givenState2LetterAbbrev: string):number {
        var IDtoReturn:number = 0;

        switch (givenState2LetterAbbrev) {
            case "AK": 	IDtoReturn = 1; break;
            case "AL": 	IDtoReturn = 2; break;
            case "AR": 	IDtoReturn = 3; break;
            case "AZ": 	IDtoReturn = 4; break;
            case "CA": 	IDtoReturn = 5; break;
            case "CO": 	IDtoReturn = 6; break;
            case "CT": 	IDtoReturn = 7; break;
            case "DC": 	IDtoReturn = 8; break;
            case "DE": 	IDtoReturn = 9; break;
            case "FL": 	IDtoReturn = 10; break;
            case "GA": 	IDtoReturn = 11; break;
            case "HI": 	IDtoReturn = 12; break;
            case "IA": 	IDtoReturn = 13; break;
            case "ID": 	IDtoReturn = 14; break;
            case "IL": 	IDtoReturn = 15; break;
            case "IN": 	IDtoReturn = 16; break;
            case "KS": 	IDtoReturn = 17; break;
            case "KY": 	IDtoReturn = 18; break;
            case "LA": 	IDtoReturn = 19; break;
            case "MA": 	IDtoReturn = 20; break;
            case "MD": 	IDtoReturn = 21; break;
            case "ME": 	IDtoReturn = 22; break;
            case "MI": 	IDtoReturn = 23; break;
            case "MN": 	IDtoReturn = 24; break;
            case "MO": 	IDtoReturn = 25; break;
            case "MS": 	IDtoReturn = 26; break;
            case "MT": 	IDtoReturn = 27; break;
            case "NC": 	IDtoReturn = 28; break;
            case "ND": 	IDtoReturn = 29; break;
            case "NE": 	IDtoReturn = 30; break;
            case "NH": 	IDtoReturn = 31; break;
            case "NJ": 	IDtoReturn = 32; break;
            case "NM": 	IDtoReturn = 33; break;
            case "NV": 	IDtoReturn = 34; break;
            case "NY": 	IDtoReturn = 35; break;
            case "OH": 	IDtoReturn = 36; break;
            case "OK": 	IDtoReturn = 37; break;
            case "OR": 	IDtoReturn = 38; break;
            case "PA": 	IDtoReturn = 39; break;
            case "RI": 	IDtoReturn = 40; break;
            case "SC": 	IDtoReturn = 41; break;
            case "SD": 	IDtoReturn = 42; break;
            case "TN": 	IDtoReturn = 43; break;
            case "TX": 	IDtoReturn = 44; break;
            case "UT": 	IDtoReturn = 45; break;
            case "VA": 	IDtoReturn = 46; break;
            case "VT": 	IDtoReturn = 47; break;
            case "WA": 	IDtoReturn = 48; break;
            case "WI": 	IDtoReturn = 49; break;
            case "WV": 	IDtoReturn = 50; break;
            case "WY": 	IDtoReturn = 51; break;
        }
        return IDtoReturn;
    }

    USStateNameFromNumber(givenNumber: number):string {
        var retVal:string = "";

        switch (givenNumber) {
            case 1: 	retVal = "Alaska"; break;
            case 2: 	retVal = "Alabama"; break;
            case 3: 	retVal = "Arkansas"; break;
            case 4: 	retVal = "Arizona"; break;
            case 5: 	retVal = "California"; break;
            case 6: 	retVal = "Colorado"; break;
            case 7: 	retVal = "Connecticut"; break;
            case 8: 	retVal = "District of Columbia"; break;
            case 9: 	retVal = "Delaware"; break;
            case 10: 	retVal = "Florida"; break;
            case 11: 	retVal = "Georgia"; break;
            case 12: 	retVal = "Hawaii"; break;
            case 13: 	retVal = "Iowa"; break;
            case 14: 	retVal = "Idaho"; break;
            case 15: 	retVal = "Illinois"; break;
            case 16: 	retVal = "Indiana"; break;
            case 17: 	retVal = "Kansas"; break;
            case 18: 	retVal = "Kentucky"; break;
            case 19: 	retVal = "Louisiana"; break;
            case 20: 	retVal = "Massachusetts"; break;
            case 21: 	retVal = "Maryland"; break;
            case 22: 	retVal = "Maine"; break;
            case 23: 	retVal = "Michigan"; break;
            case 24: 	retVal = "Minnesota"; break;
            case 25: 	retVal = "Missouri"; break;
            case 26: 	retVal = "Mississippi"; break;
            case 27: 	retVal = "Montana"; break;
            case 28: 	retVal = "North Carolina"; break;
            case 29: 	retVal = "North Dakota"; break;
            case 30: 	retVal = "Nebraska"; break;
            case 31: 	retVal = "New Hampshire"; break;
            case 32: 	retVal = "New Jersey"; break;
            case 33: 	retVal = "New Mexico"; break;
            case 34: 	retVal = "Nevada"; break;
            case 35: 	retVal = "New York"; break;
            case 36: 	retVal = "Ohio"; break;
            case 37: 	retVal = "Oklahoma"; break;
            case 38: 	retVal = "Oregon"; break;
            case 39: 	retVal = "Pennsylvania"; break;
            case 40: 	retVal = "Rhode Island"; break;
            case 41: 	retVal = "South Carolina"; break;
            case 42: 	retVal = "South Dakota"; break;
            case 43: 	retVal = "Tennessee"; break;
            case 44: 	retVal = "Texas"; break;
            case 45: 	retVal = "Utah"; break;
            case 46: 	retVal = "Virginia"; break;
            case 47: 	retVal = "Vermont"; break;
            case 48: 	retVal = "Washington"; break;
            case 49: 	retVal = "Wisconsin"; break;
            case 50: 	retVal = "West Virginia"; break;
            case 51: 	retVal = "Wyoming"; break;
        }
        return retVal;
    }

    // Return mmmm d, yyyy format of a given date string, assuming input string is in format yyyy-mm-dd and then possibly T00:00:00+00:00 or similar time code suffix at end
    // NOTE: the "simple" method of using Date object gets more complicated because you do not want the time zone to roll the day over improperly for local time zone.
    // So, we maintain work in this function only with string operations, not with any Date() calls.
    cleanedMonthDayYear(dateString: string): string {
        var retVal: string = ""; // keep as "" for null input
        var monthString: string[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (dateString != null && dateString.length >= 10) {
            var whichMonth: number = +dateString.substring(5, 7);
            if (whichMonth >= 1 && whichMonth <= 12) {
                var givenDay: number = +dateString.substring(8, 10);
                retVal = monthString[whichMonth - 1] + " " + givenDay + ", " + dateString.substring(0, 4);
            }
        }
        return retVal;
    }

    // Return mmmm d, yyyy format for given zero-ordered month (i.e., January is 0), day and year.
    cleanedMonthDayYearFromNumbers(whichZeroOrderedMonth: number, givenDay: number, givenYear: number) : string {
        var retVal: string = ""; // keep as "" for null input
        var monthString: string[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (whichZeroOrderedMonth >= 0 && whichZeroOrderedMonth <= 11)
            retVal = monthString[whichZeroOrderedMonth] + " " + givenDay + ", " + givenYear;
        return retVal;
    }

    // Thin out the given string by removing all . ? / ; characters, as these are not addressed by
    // Angular 2 URLSearchParams.  From https://angular.io/docs/ts/latest/api/http/index/URLSearchParams-class.html,
    // other characters that are not encoded are: $ \' ( ) * + , ; A 9 - . _ ~ ? / but that's not correct it seems since
    // + for example is turned into %2B.
    // !!!TBD!!! TODO: Perhaps be stricter here and only allow a small subset of characters to be accepted like A-Z,a-z,0-9, space, *, etc.
    // Instead, we opted to remove four problem characters that affect router/ URL parsing.
    // Update June 2017: allowing "." as that is an important character to search for in accession field on biographies.
    // Formerly, "." was stripped out along with ? / ;.
    cleanedRouterParameter(givenString: string): string {
        return givenString
            .replace(/\?/gi, '')
            .replace(/\//gi, '')
            .replace(/\;/gi, '');
    }

    // See cleanedRouterParameter for some of the replacements.
    // NOTE: June 2019 addition: iOS introduced "smart quotes" which interfered with strict ASCII straight quote interpretation on
    // matching a phrase, e.g., “hot pink” treated like hot pink matching tens of stories with both words rather than
    // treated like "hot pink" matching under ten stories having this exact two-word phrase.  Solve by replacing:
    // “ to "
    // ” to "
    // ‘ to '
    // ’ to '
    cleanedQueryRouterParameter(givenString: string): string {
        return givenString
            .replace(/\?/gi, '')
            .replace(/\//gi, '')
            .replace(/“/gi, '"')
            .replace(/”/gi, '"')
            .replace(/‘/gi, '\'')
            .replace(/’/gi, '\'')
            .replace(/\;/gi, '');
    }
}
