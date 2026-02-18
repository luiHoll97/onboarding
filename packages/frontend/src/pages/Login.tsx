import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuthToken, getAuthToken, setAuthToken } from "../auth.ts";
import logo from "../assets/logo2.png";

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      expiresAt
      user {
        id
        email
        name
        role
        permissions
        createdAt
      }
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      role
      permissions
    }
  }
`;

type LoginData = {
  login: {
    token: string;
    expiresAt: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      permissions: string[];
      createdAt: string;
    };
  } | null;
};

type MeData = {
  me: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  } | null;
};

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@driver.app");
  const [password, setPassword] = useState("admin123");
  const [formError, setFormError] = useState("");
  const token = getAuthToken();

  const { data: meData, loading: meLoading } = useQuery<MeData>(ME_QUERY, {
    skip: !token,
    fetchPolicy: "network-only",
  });

  const [login, loginState] = useMutation<LoginData>(LOGIN_MUTATION);

  useEffect(() => {
    if (!token) return;
    if (meData?.me) {
      navigate("/", { replace: true });
      return;
    }
    if (!meLoading && !meData?.me) {
      clearAuthToken();
    }
  }, [token, meData, meLoading, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const result = await login({ variables: { email, password } });
    if (!result.data?.login?.token) {
      setFormError("Invalid email or password.");
      return;
    }
    setAuthToken(result.data.login.token);
    const nextPath =
      typeof location.state === "object" &&
      location.state &&
      "from" in location.state &&
      typeof location.state.from === "string"
        ? location.state.from
        : "/";
    navigate(nextPath, { replace: true });
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-100 p-4">
      <form
        className="grid w-full max-w-md justify-items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
        onSubmit={onSubmit}
      >
        <img src={logo} alt="Driver Onboarding" className="h-22 w-22 object-contain" />
        <h1 className="text-2xl font-semibold text-slate-900">Admin Login</h1>
        <p className="text-sm text-slate-500">Sign in to access onboarding dashboard.</p>

        <label className="grid w-full gap-1 text-center text-sm text-slate-500">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          />
        </label>

        <label className="grid w-full gap-1 text-center text-sm text-slate-500">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          />
        </label>

        <button
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          type="submit"
          disabled={loginState.loading}
        >
          {loginState.loading ? "Signing in..." : "Sign In"}
        </button>

        {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
        {loginState.error ? (
          <p className="text-sm text-red-700">{loginState.error.message}</p>
        ) : null}
      </form>
    </div>
  );
}
