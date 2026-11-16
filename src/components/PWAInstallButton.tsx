import { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export function PWAInstallButton({
  installLabel,
  installIosLabel,
  iosTitle,
  iosSteps,
  closeLabel,
}: {
  installLabel: string;
  installIosLabel: string;
  iosTitle: string;
  iosSteps: string;
  closeLabel: string;
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#0A2A3F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#123D5A] dark:bg-slate-100 dark:text-[#0F172A] dark:hover:bg-white whitespace-nowrap"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{installLabel}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#111827] hover:bg-[#F8FAFC] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100 whitespace-nowrap"
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>{installIosLabel}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg border border-[#E2E8F0] bg-white p-6 dark:border-slate-700 dark:bg-[#1E293B]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                  {iosTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={closeLabel}
                  className="rounded-md p-1 text-[#6B7280] hover:bg-[#F1F5F9] dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5563] dark:text-slate-300">
                {iosSteps}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 min-h-[44px] w-full rounded-lg bg-[#0A2A3F] py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-[#0F172A]"
              >
                {closeLabel}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator({ label }: { label: string }) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </div>
    </div>
  );
}
