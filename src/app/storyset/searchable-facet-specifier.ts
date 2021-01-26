export class SearchableFacetSpecifier {
    static readonly FACET_COUNT: number = 8; // there are 8 types of facets described in this structure (named below)

    public genderFacetSpec: string;
    public makerFacetSpec: string;
    public jobFacetSpec: string;
    public birthDecadeFacetSpec: string;
    public regionUSStateFacetSpec: string;
    public organizationFacetSpec: string;
    public namedDecadeFacetSpec: string;
    public namedYearFacetSpec: string;
}
