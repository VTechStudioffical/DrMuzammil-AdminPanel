import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_login")({
  component: LoginLayout,
});

function LoginLayout() {
  return <Outlet />;
}
