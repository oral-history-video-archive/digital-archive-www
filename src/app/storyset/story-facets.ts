import { StringFacet } from '../historymakers/string-facet';
import { NumberFacet } from '../historymakers/number-facet';

export class StoryFacets {
    public gender: StringFacet[];
    public birthYear: NumberFacet[]; // !!!TBD!!! NOTE: API should name this birthDecade, not birthYear!!! Update when API updates!
    public makerCategories: StringFacet[];
    public occupationTypes: StringFacet[];
    public entityDecades: NumberFacet[];
    public entityYears: NumberFacet[];
    public entityOrganizations: StringFacet[];
    public entityCountries: StringFacet[];
    public entityStates: StringFacet[];
}
