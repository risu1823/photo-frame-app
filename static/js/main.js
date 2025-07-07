document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const photoFrame = document.getElementById('photoFrame');
    const photoImg = document.getElementById('photoImg');
    const placeholder = document.getElementById('placeholder');
    const uploadArea = document.getElementById('uploadArea');
    const photoInput = document.getElementById('photoInput');

    const templateButtons = document.querySelectorAll('#templateButtonGroup .btn');
    const aspectButtons = document.querySelectorAll('#aspectButtonGroup .btn');
    const alignButtons = document.querySelectorAll('#alignButtonGroup .btn');
    const colorControlItem = document.getElementById('colorControlItem');
    const colorButtons = document.querySelectorAll('#colorButtonGroup .btn');
    const downloadBtn = document.getElementById('downloadBtn');

    // 入力要素
    const allInputs = {
        cameraInfo: document.getElementById('cameraInfo'),
        shootingDate: document.getElementById('shootingDate'),
        location: document.getElementById('location'),
        shutterSpeed: document.getElementById('shutterSpeed'),
        aperture: document.getElementById('aperture'),
        iso: document.getElementById('iso'),
        focalLength: document.getElementById('focalLength'),
    };

    // 表示要素
    const allDisplays = {
        leicaCameraLens: document.getElementById('displayLeicaCameraLens'),
        leicaTime: document.getElementById('displayLeicaTime'),
        leicaDate: document.getElementById('displayLeicaDate'),
        leicaFocal: document.getElementById('displayLeicaFocal'),
        leicaAperture: document.getElementById('displayLeicaAperture'),
        leicaShutter: document.getElementById('displayLeicaShutter'),
        leicaISO: document.getElementById('displayLeicaISO'),
        leicaLocation: document.getElementById('displayLeicaLocation'),
        fujifilmCamera: document.getElementById('displayFujifilmCamera'),
        fujifilmShooting: document.getElementById('displayFujifilmShooting'),
    };

    // --- イベントリスナー設定 ---
    
    // ファイルアップロード
    uploadArea.addEventListener('click', () => photoInput.click());
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, e => e.preventDefault());
    });
    uploadArea.addEventListener('dragover', () => uploadArea.classList.add('dragover'));
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
    photoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    // ボタン類
    templateButtons.forEach(btn => btn.addEventListener('click', handleTemplateChange));
    aspectButtons.forEach(btn => btn.addEventListener('click', handleAspectChange));
    alignButtons.forEach(btn => btn.addEventListener('click', handleAlignChange));
    colorButtons.forEach(btn => btn.addEventListener('click', handleColorChange));
    downloadBtn.addEventListener('click', handleDownload);
    
    // 入力フォーム
    Object.values(allInputs).forEach(input => input.addEventListener('input', updateMetadata));

    // --- 関数定義 ---

    function handleFile(file) {
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            photoImg.src = e.target.result;
            photoImg.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);

        EXIF.getData(file, function () {
            const exif = EXIF.getAllTags(this);
            allInputs.cameraInfo.value = `${exif.Make || ''} ${exif.Model || ''}`.trim();
            if (exif.DateTimeOriginal) {
                const [date, time] = exif.DateTimeOriginal.split(' ');
                allInputs.shootingDate.value = `${date.replace(/:/g, '-')}T${time}`;
            } else {
                allInputs.shootingDate.valueAsDate = new Date();
            }
            allInputs.shutterSpeed.value = exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : '';
            allInputs.aperture.value = exif.FNumber ? `f/${exif.FNumber.toFixed(1)}` : '';
            allInputs.iso.value = exif.ISOSpeedRatings ? `ISO${exif.ISOSpeedRatings}` : '';
            allInputs.focalLength.value = exif.FocalLength ? `${exif.FocalLength}mm` : '';
            allInputs.location.value = ''; // GPSは複雑なので空に
            updateMetadata();
        });
    }

    function handleTemplateChange(e) {
        const btn = e.currentTarget;
        templateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const template = btn.dataset.frameTemplate;
        photoFrame.className = photoFrame.className.replace(/\w+-template/g, '');
        photoFrame.classList.add(`${template}-template`);

        const isCheki = template === 'cheki';
        const isFujifilm = template === 'fujifilm';
        
        // アスペクト比と色のコントロールを有効/無効化
        aspectButtons.forEach(b => b.classList.toggle('disabled', isCheki));
        colorControlItem.classList.toggle('disabled', isCheki || isFujifilm);

        if (isCheki || isFujifilm) { // チェキか富士は白フレーム固定
            photoFrame.classList.remove('black-frame');
            photoFrame.classList.add('white-frame');
            document.querySelector('[data-frame-color="white"]').classList.add('active');
            document.querySelector('[data-frame-color="black"]').classList.remove('active');
        }
        updateMetadata();
    }
    
    function handleGenericButtonClick(e, buttonGroup) {
        if (e.currentTarget.classList.contains('disabled')) return;
        buttonGroup.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
    }

    function handleAspectChange(e) {
        handleGenericButtonClick(e, aspectButtons);
        const aspect = e.currentTarget.dataset.aspect;
        photoFrame.className = photoFrame.className.replace(/aspect-\S+/g, '');
        photoFrame.classList.add(`aspect-${aspect}`);
    }

    function handleAlignChange(e) {
        handleGenericButtonClick(e, alignButtons);
        const align = e.currentTarget.dataset.align;
        photoFrame.className = photoFrame.className.replace(/align-\S+/g, '');
        photoFrame.classList.add(`align-${align}`);
    }

    function handleColorChange(e) {
        if (colorControlItem.classList.contains('disabled')) return;
        handleGenericButtonClick(e, colorButtons);
        const color = e.currentTarget.dataset.frameColor;
        photoFrame.classList.remove('black-frame', 'white-frame');
        photoFrame.classList.add(`${color}-frame`);
    }

    function updateMetadata() {
        const template = document.querySelector('#templateButtonGroup .btn.active').dataset.frameTemplate;
        
        const data = {
            camera: allInputs.cameraInfo.value || 'カメラ機種',
            date: allInputs.shootingDate.value ? new Date(allInputs.shootingDate.value) : null,
            location: allInputs.location.value || '撮影場所',
            shutter: allInputs.shutterSpeed.value || '1/125s',
            aperture: allInputs.aperture.value || 'f/2.8',
            iso: allInputs.iso.value || 'ISO800',
            focal: allInputs.focalLength.value || '50mm',
        };

        if (template === 'leica' || template === 'cheki') {
            allDisplays.leicaCameraLens.textContent = data.camera;
            allDisplays.leicaFocal.textContent = data.focal;
            allDisplays.leicaAperture.textContent = data.aperture;
            allDisplays.leicaShutter.textContent = data.shutter;
            allDisplays.leicaISO.textContent = data.iso;
            allDisplays.leicaLocation.textContent = data.location;
            if (data.date) {
                allDisplays.leicaDate.textContent = data.date.toLocaleDateString('ja-JP-u-ca-japanese', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
                allDisplays.leicaTime.textContent = data.date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
        }
        
        if (template === 'fujifilm') {
            allDisplays.fujifilmCamera.textContent = `Shot on ${data.camera}`;
            allDisplays.fujifilmShooting.textContent = `${data.focal} ${data.aperture} ${data.shutter} ${data.iso}`;
        }
    }

    function handleDownload() {
        html2canvas(photoFrame, { useCORS: true, scale: 2 })
            .then(canvas => {
                const link = document.createElement('a');
                link.download = 'photo_frame.png';
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            });
    }

    // --- 初期化処理 ---
    document.querySelector('[data-frame-template="leica"]').click();
});
