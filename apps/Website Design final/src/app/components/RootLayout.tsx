import { Outlet } from "react-router";
import { LoginDialog } from "./LoginDialog";
import { useWebsiteAuth } from "../context/WebsiteAuthContext";
import { Toaster } from "sonner";

export function RootLayout() {
  const { loginOpen, setLoginOpen } = useWebsiteAuth();
  return (
    <>
      <Outlet />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <Toaster position="top-center" closeButton={false} />
    </>
  );
}
