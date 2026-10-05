// Compartida entre montajes: una cámara nueva espera a que termine el cierre anterior.
let cameraOperation = Promise.resolve();

export function enqueueCameraOperation(operation) {
  const result = cameraOperation.then(operation);
  cameraOperation = result.catch(() => {});
  return result;
}

export function getPreferredBackCamera(cameras) {
  const rear = cameras.filter(({ label }) => {
    const name = String(label || '').toLowerCase();
    return /back|rear|environment|traser|posterior|ultra|gran angular|wide/.test(name)
      && !/front|frontal|facetime|user/.test(name);
  });
  // En iPhone preferimos una lente física; las cámaras dual/triple son virtuales.
  const physical = rear.filter(({ label }) => !/dual|triple/.test(String(label || '').toLowerCase()));
  return physical.find(({ label }) => /ultra/.test(String(label || '').toLowerCase()))
    || physical.find(({ label }) => /wide|gran angular/.test(String(label || '').toLowerCase()))
    || physical[0]
    || rear[0]
    || null;
}
