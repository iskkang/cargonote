import { Routes, Route } from 'react-router-dom';
import App from './App';
import { AdminConsole } from './admin/AdminConsole';
import { AuthGate } from './auth/AuthGate';
import { Placeholder } from './admin/Placeholder';
import { WorkerCapture } from './worker/WorkerCapture';
import { ViewerGallery } from './viewer/ViewerGallery';
import { Landing } from './landing/Landing';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<AuthGate><AdminConsole /></AuthGate>} />
      <Route path="/spike" element={<App />} />
      <Route path="/c/:token" element={<WorkerCapture />} />
      <Route path="/v/:token" element={<ViewerGallery />} />
      <Route path="*" element={<Placeholder title="페이지 없음" />} />
    </Routes>
  );
}
