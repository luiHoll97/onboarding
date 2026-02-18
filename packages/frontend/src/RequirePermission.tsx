import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearAuthToken, getAuthToken } from "./auth.ts";

const ME_QUERY = gql`
  query MeForPermission {
    me {
      id
      permissions
    }
  }
`;

type MePermissionData = {
  me: {
    id: string;
    permissions: string[];
  } | null;
};

export function RequirePermission({
  children,
  permission,
}: {
  children: ReactElement;
  permission: string;
}) {
  const location = useLocation();
  const token = getAuthToken();
  const { data, loading, error } = useQuery<MePermissionData>(ME_QUERY, {
    skip: !token,
    fetchPolicy: "cache-first",
  });

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Checking permissions...</div>;
  }

  if (error || !data?.me) {
    clearAuthToken();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!data.me.permissions.includes(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
