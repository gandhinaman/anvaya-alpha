// Detect if running inside a Capacitor native shell
export const isNative = (): boolean => {
  return !!(window as any).Capacitor?.isNativePlatform?.() 
    || !!(window as any).Capacitor?.isPluginAvailable;
};

export const isIOS = (): boolean => {
  return isNative() && /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  return isNative() && /android/i.test(navigator.userAgent);
};
