import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c925c24725694894a454e2ca45ec73d4',
  appName: 'medi-vault-access',
  webDir: 'dist',
  server: {
    url: 'https://c925c247-2569-4894-a454-e2ca45ec73d4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;