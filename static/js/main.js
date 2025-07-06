const photoInput = document.getElementById('photoInput');
const photoImg = document.getElementById('photoImg');

photoInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        photoImg.src = e.target.result;
        photoImg.style.display = 'block';
    };
    reader.readAsDataURL(file);

    EXIF.getData(file, function () {
        const exif = EXIF.getAllTags(this);
        document.getElementById('camera').textContent = `カメラ機種: ${exif.Make || ''} ${exif.Model || ''}`;
        document.getElementById('datetime').textContent = `撮影日時: ${exif.DateTimeOriginal || '-'}`;
        document.getElementById('shutter').textContent = `シャッター速度: ${exif.ExposureTime ? '1/' + Math.round(1 / exif.ExposureTime) : '-'}`;
        document.getElementById('aperture').textContent = `絞り: ${exif.FNumber ? 'f/' + exif.FNumber : '-'}`;
        document.getElementById('iso').textContent = `ISO: ${exif.ISOSpeedRatings || '-'}`;
        document.getElementById('focal').textContent = `焦点距離: ${exif.FocalLength ? exif.FocalLength + 'mm' : '-'}`;
    });
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('photoFrame')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'photo_frame.png';
        link.href = canvas.toDataURL();
        link.click();
    });
});
