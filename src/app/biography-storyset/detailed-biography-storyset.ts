import { BiographySession } from './biography-session';
import { BiographyFavorites } from '../story/biography-favorites';

export class DetailedBiographyStorySet {
    public biographyID: number;
    public accession: string;
    public descriptionShort: string;
    public biographyShort: string;
    public firstName: string;
    public lastName: string;
    public preferredName: string;
    public gender: string;
    public websiteURL: string;
    public region: string;
    public birthCity: string;
    public birthState: string;
    public birthCountry: string;
    public occupations: string[];
    public birthDate: string;
    public deceasedDate: string;
    public isScienceMaker: boolean;
    public makerCategories: string[];
    public occupationTypes: string[];
    public favorites: BiographyFavorites;
    public sessions: BiographySession[];
}
