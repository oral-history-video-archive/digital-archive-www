export class SearchFormOptions {

  constructor(
      public searchingBiographies: boolean,         // if true, searching biographies, false means searching stories
      public biographyIDForLimitingSearch: number,  // if a value besides NOTHING_CHOSEN (-1), the ID for which person to search into for stories, else search all stories
      public biographyAccessionID: string,          // the accession ID string for the person whose ID is biographyIDForLimitingSearch, or "" by default/if empty
      public allowAdvancedStorySearchSettings: boolean // if true, allow "extras" like filtering based on interview year, to be tacked onto story search
  ) { }
}
