import { ProtectedDashboard } from "@/features/auth";

export default function HomePage() {
  return <ProtectedDashboard />;
}
