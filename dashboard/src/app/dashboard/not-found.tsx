import { Compass } from 'lucide-react';
import { ComingSoon } from '@/components/coming-soon';

/**
 * Segment-scoped 404. Because it lives at /dashboard/not-found.tsx,
 * Next.js renders it INSIDE the dashboard layout — sidebar, topbar, and
 * the alert ticker stay visible so the officer can pivot to a real module.
 */
export default function DashboardNotFound() {
  return (
    <ComingSoon
      title="Module not found"
      description="This route doesn't exist yet — either it's mistyped or you arrived from a stale link. Use the sidebar to jump to a live module."
      icon={Compass}
    />
  );
}
