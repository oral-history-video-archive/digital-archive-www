// Inspiration for this particular architecture choice is via:
// https://blog.thecodecampus.de/angular-2-include-google-analytics-event-tracking/
// but rather than Google Analytics, a package that defines the "_ll" analytics reporting (see index.html) is used.
import {Injectable} from "@angular/core";

declare var _ll: any; // Declaration used with LibLynx analytics for COUNTER

@Injectable()
export class AnalyticsService {

  public logBiographySearchForCOUNTER(givenQuery: string, givenQueryType: string) {
    _ll.push(['trackSearch', {
      dbs:[
         {dbid:'2020_05_bio_v1', dbname:'THMDA_Biographies'}
      ],
      queryType:givenQueryType,
      query:givenQuery
    }]);
  }

  public logStorySearchForCOUNTER(givenQuery: string, givenQueryType: string) {
    _ll.push(['trackSearch', {
      dbs:[
         {dbid:'2020_05_story_v1', dbname:'THMDA_Stories'}
      ],
      queryType:givenQueryType,
      query:givenQuery
    }]);
  }

  public logStoryTagSearchForCOUNTER(givenQuery: string) {
    _ll.push(['trackSearch', {
      dbs:[
         {dbid:'2020_05_tag_v1', dbname:'THMDA_StoryTags'}
      ],
      queryType:'tagSearch',
      query:givenQuery
    }]);
  }

  public logStoryLookupForCOUNTER(storyID: number, biographyID: string, storyTitle: string) {
    var storyPublicationYear: number = this.parseBioIDForYear(biographyID);
    //console.log("logging story " + storyID + " with yop " + storyPublicationYear);
    // NOTE:  details are of the form:
    // The HistoryMakers Digital Archive story 378323 A2006.130 Lezli Baskerville talks about her father's musical talent
    _ll.push(['trackItemRequest', {
      dbid:'2020_05_story_v1',
      dbname:'THMDA_Stories',
      // no need to specify, as it will default to "controlled": at: 'controlled',
      // no need to specify, as it will default to "regular": am: 'regular',
      yop: storyPublicationYear,
      // plus additional fields describing the item at title level...
      tm:{ dt: 'database', 'id':'2020_05_story_v1', 'title':'THMDA_Stories' },
      // (details on the actual story item)
      im:{ dt: 'multimedia', 'id':storyID, 'title':'The HistoryMakers Digital Archive story ' + storyID + ' ' + biographyID + ' ' + storyTitle}
    }]);
  }

  public logBiographyLookupForCOUNTER(biographyID: string, biographyName: string) {
    var yearOfPublication: number = this.parseBioIDForYear(biographyID);
    //console.log("logging bio " + biographyID + " with yop " + yearOfPublication);
    // NOTE:  details are of the form:
    // The HistoryMakers Digital Archive biography A2006.130 Lezli Baskerville
    _ll.push(['trackItemRequest', {
      dbid:'2020_05_bio_v1',
      dbname:'THMDA_Biographies',
      // no need to specify, as it will default to "controlled": at: 'controlled',
      // no need to specify, as it will default to "regular": am: 'regular',
      yop: yearOfPublication,
      // plus additional fields describing the item at title level...
      tm:{ dt: 'database', 'id':'2020_05_bio_v1', 'title':'THMDA_Biographies' },
      // (details on the actual biography item)
      im:{ dt: 'multimedia', 'id':biographyID, 'title':'The HistoryMakers Digital Archive biography ' + biographyID + ' ' + biographyName}
    }]);
  }

  private parseBioIDForYear(givenBioID: string): number {
    const LibLynx_UNKNOWN_YEAR:number = 1; // 1 == "unknown" with the LibLynx API for COUNTER reporting of year of publication
    var retVal: number = LibLynx_UNKNOWN_YEAR;
    if (givenBioID.startsWith("A") && givenBioID.length >= 5) {
      // Assuming a start of A#### with #### parsing to the year of publication
      var yearCandidate: string = givenBioID.substring(1, 5);
      var candidateYear = +yearCandidate;
      if (candidateYear != null && candidateYear > 0)
          retVal = candidateYear;
    }
    return retVal;
  }
}
