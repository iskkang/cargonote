import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { AdminConsole } from './admin/AdminConsole';
import { Placeholder } from './admin/Placeholder';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminConsole />} />
      <Route path="/spike" element={<App />} />
      <Route path="/c/:token" element={<Placeholder title="작업자 촬영" />} />
      <Route path="/v/:token" element={<Placeholder title="증빙 갤러리" />} />
      <Route path="*" element={<Placeholder title="페이지 없음" />} />
    </Routes>
  );
}
