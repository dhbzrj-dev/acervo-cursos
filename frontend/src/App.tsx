import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import CoursePage from "@/pages/CoursePage";
import MyCourses from "@/pages/MyCourses";
import Categories from "@/pages/Categories";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import Sala from "@/pages/Sala";
import Termos from "@/pages/Termos";

export default function App() {
  const location = useLocation();
  const telegramStoleHash =
    location.pathname.includes("tgWebApp") || location.hash.includes("tgWebAppData");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const hideBottomNav =
    location.pathname.startsWith("/curso/") || location.pathname.startsWith("/admin");

  if (telegramStoleHash) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/curso/:id" element={<CoursePage />} />
        <Route path="/meus-cursos" element={<MyCourses />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/sala" element={<Sala />} />
        <Route path="/termos" element={<Termos />} />
      </Routes>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}