export class BiographyStory {
    public storyID: number;
    public storyOrder: number;
    public duration: number;
    public title: string;
    public entityStates: string[]; // array of two-letter states, like "HI" for Hawaii, that this story mentions as detected by automated processing
}
