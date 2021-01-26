import { FacetDetail } from './facet-detail';

// NOTE: enums in TypeScript are number based (and numbers may be used in
// historymakers.component.html instead of enums so None == 0, LastName == 1, etc. if
// order changes here update that renderer html as well!!!
export enum BioFilterFamilyType {
    None,
    LastNameInitial,
    Category,
    Gender,
    BirthDecade,
    BirthState,
    JobType
}

export const BioFilterFamilyTypeCount = 7; // maximum number of types (including none)

export class FacetWithFamily {
  public setID: BioFilterFamilyType; // should never be BioFilterFamilyType.None for valid content
  public ID: string;
  public value: string;
}
