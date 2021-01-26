// NOTE: enums in TypeScript are number based. Do not change this ordering as that will break any bookmarks
// saved with the expectation that 1 == biography collection, 2 == text search, etc. (0 == none).
export enum StorySetType {
        None,
        BiographyCollection,
        TextSearch,
        TagSearch,
        StarredSet,
        Mixtape,
        GivenIDSet
}
