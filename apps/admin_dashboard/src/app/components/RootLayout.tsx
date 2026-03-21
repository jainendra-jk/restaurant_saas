import { Layout } from './Layout';
import { MobileGate } from './MobileGate';
import { ProfileLogoProvider } from '../context/ProfileLogoContext';

export function RootLayout() {
  return (
    <MobileGate>
      <ProfileLogoProvider>
        <Layout />
      </ProfileLogoProvider>
    </MobileGate>
  );
}