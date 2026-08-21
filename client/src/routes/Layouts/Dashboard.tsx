import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { QueryKeys } from '@hanzochat/data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext, usePreviousLocation } from '~/hooks';
import { DashboardContext } from '~/Providers';
import store from '~/store';

export default function DashboardRoute() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthContext();
  const prevLocationRef = usePreviousLocation();
  const clearConvoState = store.useClearConvoState();
  const [prevLocationPath, setPrevLocationPath] = useState('');

  useEffect(() => {
    setPrevLocationPath(prevLocationRef.current?.pathname || '');
  }, [prevLocationRef]);

  useEffect(() => {
    queryClient.removeQueries([QueryKeys.messages, 'new']);
    clearConvoState();
  }, [queryClient, clearConvoState]);

  /* Something must always paint. Returning null here answered every `/d/…`
     address with a BLANK PAGE for anyone without a session — no shell, no
     composer, no explanation, and the URL left sitting on a route that had
     rendered nothing. It also swallowed this layout's own children, so the
     `*` redirect below it never mounted and could not correct the address.
     The dashboard is user data and a guest has none, so the honest answer is
     the product. */
  if (!isAuthenticated) {
    return <Navigate to="/" replace={true} />;
  }

  return (
    <DashboardContext.Provider value={{ prevLocationPath }}>
      <div className="h-screen w-full">
        <Outlet />
      </div>
    </DashboardContext.Provider>
  );
}
