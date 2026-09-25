import { Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Home from "@/pages/Home";
import CoursePage from "@/pages/CoursePage";
import MyCourses from "@/pages/MyCourses";
import Categories from "@/pages/Categories";
import Profile from "@/pages/Profile";

export default function App() {
  const location = useLocation();
  // A página do curso tem seu próprio botão sticky em tela cheia;
  // esconder a bottom nav nela evita dois CTAs competindo por atenção.
  const hideBottomNav = location.pathname.startsWith("/curso/");

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/curso/:id" element={<CoursePage />} />
        <Route path="/meus-cursos" element={<MyCourses />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/perfil" element={<Profile />} />
      </Routes>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
