import { Navigate } from 'react-router-dom';
import {
  PromptsView,
  PromptForm,
  CreatePromptForm,
  EmptyPromptPreview,
} from '~/components/Prompts';
import DashboardRoute from './Layouts/Dashboard';

const dashboardRoutes = {
  path: 'd/*',
  element: <DashboardRoute />,
  children: [
    {
      path: 'prompts/*',
      element: <PromptsView />,
      children: [
        {
          index: true,
          element: <EmptyPromptPreview />,
        },
        {
          path: 'new',
          element: <CreatePromptForm />,
        },
        {
          path: ':promptId',
          element: <PromptForm />,
        },
      ],
    },
    // Prompts is the only child this dashboard serves, so it is where an
    // unmatched `/d/…` lands. It used to point at `/d/files`, a route that was
    // commented out above it — so the redirect matched this same splat again and
    // the URL bounced against itself. Point a fallback at something that
    // renders, or it is not a fallback.
    {
      path: '*',
      element: <Navigate to="/d/prompts" replace={true} />,
    },
  ],
};

export default dashboardRoutes;
