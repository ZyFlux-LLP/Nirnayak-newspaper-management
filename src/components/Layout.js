import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";

const Layout = ({ children }) => {
  const location = useLocation();
  const hideNavbarRoutes = ["/admin", "/login"];

  return (
    <div className="app">
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}
      <div className="content">{children}</div>
    </div>
  );
};

export default Layout;
