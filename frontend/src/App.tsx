import { Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import CoursePage from "@/pages/CoursePage";
import MyCourses from "@/pages/MyCourses";
import Categories from "@/pages/Categories";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";

export default function App() {
  const location = useLocation();
  const hideBottomNav =
    location.pathname.startsWith("/curso/") ||
    location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/curso/:id" element={<CoursePage />} />
        <Route path="/meus-cursos" element={<MyCourses />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}