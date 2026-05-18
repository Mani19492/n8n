import { useParams, useLocation } from 'react-router-dom';
import OperationalWorkspace from '@/components/workspace/InvestigationWorkspace';

export default function WorkspacePage() {
  const { id } = useParams();
  const location = useLocation();

  if (!id) return <div>Invalid Investigation ID</div>;

  return (
    <div className="h-screen bg-[#020617] overflow-hidden">
      <OperationalWorkspace investigationId={id} initialData={location.state} />
    </div>
  );
}
