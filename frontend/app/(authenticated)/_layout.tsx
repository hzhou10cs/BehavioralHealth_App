import { Redirect, Slot } from "expo-router";
import { useSession } from "../../lib/session";

export default function AuthenticatedLayout() {
  const { isAuthenticated } = useSession();

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
