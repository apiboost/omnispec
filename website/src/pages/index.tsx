import {Redirect} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home(): React.ReactNode {
  // Docs-only site: send the root to Getting Started.
  return <Redirect to={useBaseUrl('/docs/getting-started')} />;
}
