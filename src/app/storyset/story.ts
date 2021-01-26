import { StoryHighlight } from './story-highlight';
import { StoryDocument } from './story-document';

export class Story {
    public score: number;
    public highlights: StoryHighlight;
    public document: StoryDocument;
}
