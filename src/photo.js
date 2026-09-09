export async function preparePhoto(file) {
  if (!file || file.size === 0) throw new Error('Valitse kuva tuotteesta.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Kuva on liian suuri. Valitse alle 20 Mt kuva.');
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) throw new Error('Valitse JPG-, PNG- tai WebP-kuva. iPhonella voit myös ottaa uuden kuvan.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { throw new Error('Tätä kuvamuotoa ei voi avata tässä selaimessa. Valitse JPG-kuva tai ota uusi kuva.'); }
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Kuvaa ei voitu lukea.');
    const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data = canvas.toDataURL('image/jpeg', .82);
    if (data.length > 3_000_000) throw new Error('Kuva on liian yksityiskohtainen. Kokeile rajata se tuotteeseen.');
    return data;
  } finally { URL.revokeObjectURL(url); }
}
