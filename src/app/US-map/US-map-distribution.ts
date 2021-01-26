export class USMapDistribution {
    public count: number[]; // assumed to get filled with counts for all 50 United States plus the District of Columbia plus an unknown slot at index 0 (so 52 values)
    public mapRegionListTitle: string; // title for the list of U.S. states plus D.C., e.g., "Birth State" or simply "U.S. State"
    public keyEntitySetCount: number; // how many in the master set being visualized (used to generate text description for this map visualization)
    public keyTitle: string;
    public keyEntitySingular: string; // the entity being counted, in singular format
    public keyEntityPlural: string; // the entity being counted, in plural format
    public keySuffix: string; // tacked on after count and entity in key, e.g., "born here" to compose "1 HistoryMaker born here" or "20 HistoryMakers born here"
    public verbLeadIn: string; // used in constructing a detailed text form of the map visualization, e.g., "discuss" or "are born in"
    public verbLeadInSingular: string; // special case for 1, e.g., "discusses" and "is born in"
    public verbPhrase: string; // used in constructing a detailed text form of the map visualization, e.g., "Discussed in" or "Birthplace of"
    public exceptionDescription: string; // used to describe unplotted data, e.g., "NOTE: 89 HistoryMakers born outside the U.S. or have unrecorded birth location.""
    public regionIDsAlreadyInFilter: string; // comma-separated IDs of states already in filter, e.g., if this is "AZ,HI" then Arizona and Hawaii already in filter
}
