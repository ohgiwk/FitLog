if (import.meta.env.MODE === 'capacitor') {
  void import('./mobile');
} else {
  void import('./landing/main');
}
