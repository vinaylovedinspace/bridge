import { SettingsPage } from '@/features/settings/components/settings-page';
import { getBranchConfig } from '@/server/db/branch';

const BranchSettingsPage = async () => {
  const { id: branchId } = await getBranchConfig();

  return <SettingsPage branchId={branchId} />;
};

export default BranchSettingsPage;
