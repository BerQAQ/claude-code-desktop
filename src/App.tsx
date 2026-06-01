import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import TerminalPage from "./pages/TerminalPanel";

export default function App() {
  return (
    <Routes>
      <Route path="/terminal" element={<TerminalPage />} />
      <Route path="*" element={<Layout />} />
    </Routes>
  );
}
