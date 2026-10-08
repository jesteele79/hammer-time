import { createFileRoute } from "@tanstack/react-router";
import { KilnHop } from "@/components/kiln-hop";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <KilnHop />;
}
