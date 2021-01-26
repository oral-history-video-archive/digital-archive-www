import { FacetDetail } from '../historymakers/facet-detail';

// NOTE: enums in TypeScript are number based (and numbers may be used in
// storyset.component.html instead of enums so None == 0, Category == 1, etc. if
// order changes here update that renderer html as well!!!
export enum StoryFilterFamilyType {
    None,
    Category,
    Gender,
    StateInStory,
    Organization,
    DecadeInStory,
    YearInStory,
    JobType,
    DecadeOfBirth
}

export const StoryFilterFamilyTypeCount = 9; // maximum number of types (including none)

export class StoryFacetWithFamily {
  public setID: StoryFilterFamilyType; // should never be StoryFilterFamilyType.None for valid content
  public ID: string;
  public value: string;
}
