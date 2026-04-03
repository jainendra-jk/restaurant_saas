type VibrationPattern = number | number[];

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function vibrate(pattern: VibrationPattern): void {
  if (!canVibrate()) return;
  navigator.vibrate(pattern);
}

export const haptics = {
  gestureLight(): void {
    vibrate(30);
  },
  gestureMedium(): void {
    vibrate(35);
  },
  destructive(): void {
    vibrate(44);
  },
  cartAdd(): void {
    vibrate(40);
  },
  quantityChange(): void {
    vibrate(40);
  },
  orderPlaced(): void {
    vibrate([32, 42, 58]);
  },
};
