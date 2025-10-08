import { getInstructorStatusCount } from '../../server/actions';
import { InstructorStatusCard } from './instructor-status-card';

export async function InstructorStatus() {
  const instructorStatusCount = await getInstructorStatusCount();

  return <InstructorStatusCard {...instructorStatusCount} />;
}
