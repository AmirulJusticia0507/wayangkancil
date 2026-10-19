(() => {
  if (!('serviceWorker' in navigator)) return;

  let deferredInstallPrompt = null;

  const installBtn = document.createElement('button');
  installBtn.id = 'pwaInstallBtn';
  installBtn.type = 'button';
  installBtn.className =
    'px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs transition shadow-[0_0_10px_rgba(255,213,79,0.3)]';
  installBtn.textContent = '⬇️ Install Aplikasi';
  installBtn.style.display = 'none';

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('PWA service worker terdaftar:', registration.scope);
      })
      .catch((error) => {
        console.warn('PWA service worker gagal didaftarkan:', error);
      });
  });

  // Tangkap beforeinstallprompt untuk menampilkan tombol install custom
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.style.display = 'inline-block';

    // Sembunyikan tombol otomatis setelah 10 detik jika tidak diklik
    setTimeout(() => {
      if (deferredInstallPrompt && installBtn.style.display !== 'none') {
        installBtn.style.display = 'none';
      }
    }, 10000);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
    console.log('PWA terinstal.');
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('Hasil instalasi PWA:', outcome);
    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
  });

  // Sisipkan tombol install ke dalam lobby panel
  const ensureInstallBtn = () => {
    const lobbyPanel = document.querySelector('.lobby-panel');
    if (lobbyPanel && !document.getElementById('pwaInstallBtn')) {
      lobbyPanel.appendChild(installBtn);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureInstallBtn);
  } else {
    ensureInstallBtn();
  }
})();
