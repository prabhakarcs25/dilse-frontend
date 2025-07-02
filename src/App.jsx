import { useRoutes } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";

const App = () => {
  const routes = useRoutes([
    { path: "/", element: <Home /> },
    { path: "/chat", element: <Chat /> },
  ]);
  return routes;
};

export default App;
