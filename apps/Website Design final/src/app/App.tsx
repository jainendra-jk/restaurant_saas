import { RouterProvider } from "react-router";
import { WebsiteAuthProvider } from "./context/WebsiteAuthContext";
import { router } from "./routes";

export default function App() {
  return (
    <WebsiteAuthProvider>
      <RouterProvider router={router} />
    </WebsiteAuthProvider>
  );
}
