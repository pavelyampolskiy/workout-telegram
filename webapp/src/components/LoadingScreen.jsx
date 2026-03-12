import ScreenLayout from './ScreenLayout';

export function LoadingScreen({ overlay = 'bg-black/70', image, message = 'Loading…' }) {
  return (
    <ScreenLayout overlay={overlay} image={image}>
      <div className="flex items-center justify-center h-screen text-white/40 font-bebas tracking-wider">
        {message}
      </div>
    </ScreenLayout>
  );
}
