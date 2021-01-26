import { SearchFacetDetail } from './search-facet-detail';

export class BiographySearchFacetsDetails {

    static IS_FULLY_WITHIN_STORY_FACETS: boolean = true; // a flag that these fields are exactly and fully within StorySearchFacetsDetails
    public occupationTypes: SearchFacetDetail[];
    public makerCategories: SearchFacetDetail[];
}

export class StorySearchFacetsDetails {
  public occupationTypes: SearchFacetDetail[];
  public makerCategories: SearchFacetDetail[];
  public entityOrganizations: SearchFacetDetail[];
}
