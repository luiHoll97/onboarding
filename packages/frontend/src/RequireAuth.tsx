import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import { clearAuthToken, getAuthToken } from "./auth.ts";

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
    }
  }
`;

type MeData = {
  me: {
    id: string;
    email: string;
    name: string;
  } | null;
};

export function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation();
  const token = getAuthToken();
  const { data, loading, error } = useQuery<MeData>(ME_QUERY, {
    skip: !token,
    fetchPolicy: "network-only",
  });

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (loading) {
    return <div className="loading">Checking admin session...</div>;
  }

  if (error || !data?.me) {
    clearAuthToken();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
