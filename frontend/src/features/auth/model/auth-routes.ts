export const AUTH_ROUTES = {
  dashboard: "/",
  login: "/login",
  loginAfterLogout: "/login?reason=logged-out",
  loginAfterSessionExpired: "/login?reason=session-expired",
  register: "/register",
} as const;
