import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <div className="min-h-screen bg-[#E8E3D9] flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-background relative shadow-xl">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}
