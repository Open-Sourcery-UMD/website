import { CalendarEvent } from "./events";

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  gitHubUsername: string;
  discordUsername: string;
  graduationYear: string;
  technologiesExperiencedWith: string[];
  preferredTopics: string[];
  currProject: string;
  eventsAttended: CalendarEvent[];
  lastWarningTime: Date;
}