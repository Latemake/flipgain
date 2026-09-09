const KEY = 'flipgain-items-v2';
function openDb() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(KEY, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('items', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Selaimen tallennustila ei ole käytettävissä.'));
  });
}
async function transaction(mode, operation) {
  const db = await openDb();
  try {
    return await new Promise((resolve,reject) => {
      const tx = db.transaction('items',mode);
      const request = operation(tx.objectStore('items'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(new Error('Tallentaminen ei onnistunut. Selaimen tila voi olla täynnä.'));
      tx.onabort = tx.onerror;
    });
  } finally { db.close(); }
}
export const readItems = () => transaction('readonly',store=>store.getAll());
export const saveItem = item => transaction('readwrite',store=>store.put(item));
export const deleteItem = id => transaction('readwrite',store=>store.delete(id));
