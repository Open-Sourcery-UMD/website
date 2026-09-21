import { getCurrentSemester } from '@data';
import OurProjectsPage from './OurProjectsPage';

// The page is prerendered, so the semester is worked out here on the server
// and regenerated hourly - rendered in the browser instead, it would be
// frozen at the build date in the HTML and mismatch once the term turns over
export const revalidate = 3600;

export default function Page() {
  return <OurProjectsPage semester={getCurrentSemester()} />;
}
