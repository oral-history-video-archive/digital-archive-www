import { StoryFacets } from './story-facets';
import { Story } from './story';

export class SearchResult {
    public facets: StoryFacets;
    public stories: Story[];
    public count: number;
}