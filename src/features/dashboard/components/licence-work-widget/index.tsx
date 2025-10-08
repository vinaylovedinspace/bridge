import { getRemainingLicenseWorkCount } from '../../server/actions';
import { LicenceWorkWidgetCard } from './licence-work-widget';

export async function LicenceWorkWidget() {
  const stats = await getRemainingLicenseWorkCount();

  return <LicenceWorkWidgetCard {...stats} />;
}
