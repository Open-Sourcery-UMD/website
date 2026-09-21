import { getCurrentSemester } from '@data';
import GemsPage from './GemsPage';

// Prerendered, so the semester is worked out on the server and regenerated
// hourly rather than frozen at the build date (see our-projects/page.tsx)
export const revalidate = 3600;

export default function Page() {
  return <GemsPage semester={getCurrentSemester()} />;
}
