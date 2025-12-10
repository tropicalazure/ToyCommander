
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ToyCommander',
    short_name: 'ToyCommander',
    description: 'Secure, modern remote toy control interface.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#FF00FF',
    icons: [
      {
        src: 'https://picsum.photos/seed/toy-icon/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/toy-icon/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
