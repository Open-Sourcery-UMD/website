/** @type {import('next').NextConfig} */

async function loadConfig() {
  const withBundleAnalyzer = (await import('@next/bundle-analyzer')).default({
    enabled: process.env.ANALYZE === 'true',
  });

  return withBundleAnalyzer({
    // The project list used to live at /team-matching-portal; links to it
    // are out in emails and bookmarks, so keep them working
    async redirects() {
      return [
        {
          source: '/team-matching-portal',
          destination: '/our-projects',
          permanent: true,
        },
      ];
    },
  });
}

export default loadConfig();