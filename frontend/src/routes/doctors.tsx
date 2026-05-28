import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/doctors")({
  beforeLoad: () => {
    throw redirect({ to: "/doctor", replace: true });
  },
  component: () => null,
});
