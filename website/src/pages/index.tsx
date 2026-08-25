import {Redirect} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home(): React.ReactNode {
  // Docs-only site: send the root to the introduction (the story + SEO landing).
  return <Redirect to={useBaseUrl('/docs/introduction')} />;
}
