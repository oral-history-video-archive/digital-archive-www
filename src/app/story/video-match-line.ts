export class VideoMatchLine {
    // Details about a single match line: percentage into the video (used for 
    // positioning on video timeline), and match time offset within a document (story) video.
    public percentOffset: number; // percentage into the video, e.g., 0 is start, 50 halfway, 100 at end
    public time: number; // video time in milliseconds corresponding to this match
}
