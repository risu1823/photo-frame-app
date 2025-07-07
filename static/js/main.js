document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        photoFrame: document.getElementById('photoFrame'),
        photoArea: document.getElementById('photoArea'),
        photoImg: document.getElementById('photoImg'),
        placeholder: document.getElementById('placeholder'),
        uploadArea: document.getElementById('uploadArea'),
        photoInput: document.getElementById('photoInput'),
        templateButtons: document.querySelectorAll('#templateButtonGroup .btn'),
        aspectButtons: document.querySelectorAll('#aspectButtonGroup .btn'),
        colorControlItem: document.getElementById('colorControlItem'),
        colorButtons: document.querySelectorAll('#colorButtonGroup .btn'),
        downloadScreenBtn: document.getElementById('downloadScreenBtn'),
        downloadPrintBtn: document.getElementById('downloadPrintBtn'),
    };

    const inputs = {
        cameraInfo: document.getElementById('cameraInfo'),
        shootingDate: document.getElementById('shootingDate'),
        location: document.getElementById('location'),
        shutterSpeed: document.getElementById('shutterSpeed'),
        aperture: document.getElementById('aperture'),
        iso: document.getElementById('iso'),
        focalLength: document.getElementById('focalLength'),
    };

    const displays = {
        a: { camera: document.getElementById('display-a-camera'), shooting: document.getElementById('display-a-shooting'), date: document.getElementById('display-a-date'), location: document.getElementById('display-a-location') },
        b: { camera: document.getElementById('display-b-camera'), shooting: document.getElementById('display-b-shooting') },
        c: { shooting: document.getElementById('display-c-shooting') },
    };

    let originalImageSrc = null;
    let originalImageRatio = 1.5; // Default

    function setupEventListeners() {
        ui.uploadArea.addEventListener('click', () => ui.photoInput.click());
        ['dragover', 'dragleave', 'drop'].forEach(eName => ui.uploadArea.addEventListener(eName, e => e.preventDefault()));
        ui.uploadArea.addEventListener('dragover', () => ui.uploadArea.classList.add('dragover'));
        ui.uploadArea.addEventListener('dragleave', () => ui.uploadArea.classList.remove('dragover'));
        ui.uploadArea.addEventListener('drop', e => { ui.uploadArea.classList.remove('dragover'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
        ui.photoInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

        ui.templateButtons.forEach(btn => btn.addEventListener('click', handleTemplateChange));
        ui.aspectButtons.forEach(btn => btn.addEventListener('click', handleAspectChange));
        ui.colorButtons.forEach(btn => btn.addEventListener('click', handleColorChange));
        ui.downloadScreenBtn.addEventListener('click', () => handleDownload('screen'));
        ui.downloadPrintBtn.addEventListener('click', () => handleDownload('print'));
        Object.values(inputs).forEach(input => input.addEventListener('input', updateMetadata));
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = e => {
            originalImageSrc = e.target.result;
            ui.photoImg.src = originalImageSrc;
            ui.photoImg.style.display = 'block';
            ui.placeholder.style.display = 'none';
            const img = new Image();
            img.onload = () => {
                originalImageRatio = img.width / img.height;
                autoSelectAspectRatio(originalImageRatio);
            };
            img.src = originalImageSrc;
        };
        reader.readAsDataURL(file);

        EXIF.getData(file, function () {
            const exif = EXIF.getAllTags(this);
            inputs.cameraInfo.value = `${exif.Make || ''} ${exif.Model || ''}`.trim();
            if (exif.DateTimeOriginal) {
                const [date, time] = exif.DateTimeOriginal.split(' ');
                if (date && time) inputs.shootingDate.value = `${date.replace(/:/g, '-')}T${time}`;
            }
            inputs.shutterSpeed.value = exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : '';
            inputs.aperture.value = exif.FNumber ? `f/${exif.FNumber.toFixed(1)}` : '';
            inputs.iso.value = exif.ISOSpeedRatings ? `ISO${exif.ISOSpeedRatings}` : '';
            inputs.focalLength.value = exif.FocalLength ? `${exif.FocalLength}mm` : '';
            inputs.location.value = '';
            updateMetadata();
        });
    }

    function autoSelectAspectRatio(ratio) {
        const presets = [{ name: '3-2', r: 1.5 }, { name: '4-3', r: 4/3 }, { name: '16-9', r: 16/9 }, { name: '1-1', r: 1 }, { name: '21-9', r: 21/9 }];
        const closest = presets.reduce((p, c) => Math.abs(c.r - ratio) < Math.abs(p.r - ratio) ? c : p);
        const targetButton = document.querySelector(`.btn[data-aspect="${closest.name}"]`);
        if (targetButton) {
            targetButton.click();
        } else {
            // プリセットにない場合は写真の比率を直接適用
            ui.photoArea.style.aspectRatio = ratio;
        }
    }

    function handleTemplateChange(e) {
        const btn = e.currentTarget;
        ui.templateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const template = btn.dataset.frameTemplate;
        ui.photoFrame.className = 'photo-frame'; // Reset classes
        ui.photoFrame.classList.add(template);
        // Apply active color
        const activeColor = document.querySelector('#colorButtonGroup .btn.active').dataset.frameColor;
        ui.photoFrame.classList.add(`${activeColor}-frame`);

        ui.colorControlItem.classList.toggle('disabled', template !== 'template-a');
        ui.aspectButtons.forEach(b => b.classList.toggle('disabled', template === 'template-c'));

        const activeAspectButton = document.querySelector('#aspectButtonGroup .btn.active');
        if (template === 'template-c') {
            document.querySelector('.btn[data-aspect="1-1"]').click();
        } else if (activeAspectButton) {
            activeAspectButton.click(); // Re-apply aspect ratio
        }
        updateMetadata();
    }

    function handleAspectChange(e) {
        if (e.currentTarget.classList.contains('disabled')) return;
        ui.aspectButtons.forEach(b => b.classList.remove('active'));
        const btn = e.currentTarget;
        btn.classList.add('active');
        const aspect = btn.dataset.aspect.split('-').map(Number);
        ui.photoArea.style.aspectRatio = aspect[0] / aspect[1];
    }

    function handleColorChange(e) {
        if (ui.colorControlItem.classList.contains('disabled')) return;
        ui.colorButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const color = e.currentTarget.dataset.frameColor;
        ui.photoFrame.classList.remove('black-frame', 'white-frame');
        ui.photoFrame.classList.add(`${color}-frame`);
    }

    function updateMetadata() {
        const data = {
            camera: inputs.cameraInfo.value,
            date: inputs.shootingDate.value ? new Date(inputs.shootingDate.value) : null,
            location: inputs.location.value,
            shooting: [inputs.focalLength.value, inputs.aperture.value, inputs.shutterSpeed.value, inputs.iso.value].filter(Boolean).join(' '),
        };
        // Template A
        displays.a.camera.textContent = data.camera;
        displays.a.shooting.textContent = data.shooting;
        displays.a.date.textContent = data.date ? data.date.toLocaleDateString('ja-JP') : '';
        displays.a.location.textContent = data.location;
        // Template B
        displays.b.camera.textContent = data.camera;
        displays.b.shooting.textContent = data.shooting;
        // Template C
        displays.c.shooting.textContent = data.shooting;
    }

    async function handleDownload(type) {
        if (!originalImageSrc) { alert('先に写真をアップロードしてください。'); return; }
        const btn = type === 'screen' ? ui.downloadScreenBtn : ui.downloadPrintBtn;
        const originalText = btn.textContent;
        btn.textContent = '生成中...'; btn.disabled = true;
        try {
            if (type === 'screen') {
                const canvas = await html2canvas(ui.photoFrame, { useCORS: true, scale: 2 });
                downloadCanvas(canvas, 'photo_frame_screen.png', 'image/png');
            } else {
                const canvas = await createPrintCanvas();
                downloadCanvas(canvas, 'photo_frame_print.jpg', 'image/jpeg', 0.8);
            }
        } catch (error) { console.error(`${type}用画像の生成に失敗:`, error); alert('画像の生成に失敗しました。');
        } finally { btn.textContent = originalText; btn.disabled = false; }
    }

    function downloadCanvas(canvas, filename, type, quality) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL(type, quality);
        link.click();
    }

    async function createPrintCanvas() {
        const settings = {
            template: document.querySelector('#templateButtonGroup .btn.active').dataset.frameTemplate,
            aspectRatio: parseFloat(ui.photoArea.style.aspectRatio) || originalImageRatio,
            isBlack: ui.photoFrame.classList.contains('black-frame'),
            data: { camera: inputs.cameraInfo.value, date: inputs.shootingDate.value ? new Date(inputs.shootingDate.value) : null, location: inputs.location.value, shooting: [inputs.focalLength.value, inputs.aperture.value, inputs.shutterSpeed.value, inputs.iso.value].filter(Boolean).join('  ') },
        };
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = Math.round(1748 * 0.98); // 葉書サイズ相当の98%
        
        const photoH = targetWidth / settings.aspectRatio;
        let infoH = photoH * (2 / 3);
        canvas.width = targetWidth;
        canvas.height = photoH;
        
        if(settings.template !== 'template-a' && settings.template !== 'template-b' && settings.template !== 'template-c') {
            infoH = 0; // No info panel for other cases
        }
        
        if (settings.template === 'template-c') {
            canvas.height = targetWidth / settings.aspectRatio + targetWidth*0.3; // Specific layout for C
        } else {
            canvas.height += infoH;
        }

        const img = await (new Promise(r => { const i = new Image(); i.crossOrigin="anonymous"; i.onload=()=>r(i); i.src=originalImageSrc; }));
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const pArea = { x: 0, y: 0, w: targetWidth, h: photoH };
        if (settings.template === 'template-c') {
             pArea.w = targetWidth; pArea.h = targetWidth / settings.aspectRatio;
        }
        
        ctx.fillStyle = '#000'; ctx.fillRect(pArea.x, pArea.y, pArea.w, pArea.h);
        const imgR = img.width / img.height; const areaR = pArea.w / pArea.h;
        let dw, dh, dx, dy;
        if (imgR > areaR) { dw=pArea.w; dh=dw/imgR; dx=pArea.x; dy=pArea.y+(pArea.h-dh)/2; }
        else { dh=pArea.h; dw=dh*imgR; dx=pArea.x+(pArea.w-dw)/2; dy=pArea.y; }
        ctx.drawImage(img, dx, dy, dw, dh);
        
        const iArea = { x: 0, y: pArea.y + pArea.h, w: canvas.width, h: infoH, p: targetWidth*0.04 };
        if(settings.template === 'template-c') {
            iArea.h = canvas.height - pArea.h;
        }

        ctx.fillStyle = settings.isBlack && settings.template === 'template-a' ? '#111' : '#fff';
        ctx.fillRect(iArea.x, iArea.y, iArea.w, iArea.h);
        ctx.fillStyle = settings.isBlack && settings.template === 'template-a' ? '#fff' : '#333';
        const baseFont = targetWidth * 0.025;
        
        if (settings.template === 'template-a') {
            ctx.font = `bold ${baseFont*1.1}px sans-serif`; ctx.fillText(settings.data.camera, iArea.p, iArea.y + iArea.p);
            ctx.font = `${baseFont*0.9}px sans-serif`; ctx.fillText(settings.data.shooting, iArea.p, iArea.y + iArea.p*2);
            ctx.textAlign = 'right'; ctx.fillStyle = settings.isBlack ? '#ccc' : '#888';
            if (settings.data.date) { ctx.fillText(settings.data.date.toLocaleDateString('ja-JP'), iArea.w-iArea.p, iArea.y + iArea.p*2); }
            ctx.textAlign = 'left';
            ctx.font = `italic ${baseFont*0.8}px sans-serif`; ctx.fillText(settings.data.location, iArea.p, iArea.y + iArea.p*3);
        } else if (settings.template === 'template-b') {
            ctx.textAlign = 'right';
            ctx.font = `bold ${baseFont*1.1}px sans-serif`; ctx.fillText(settings.data.camera, iArea.w-iArea.p, iArea.y + iArea.h/2 - baseFont*0.6);
            ctx.font = `${baseFont*0.9}px sans-serif`; ctx.fillStyle = '#666'; ctx.fillText(settings.data.shooting, iArea.w-iArea.p, iArea.y + iArea.h/2 + baseFont*0.8);
            ctx.textAlign = 'left';
        } else if (settings.template === 'template-c') {
            ctx.textAlign = 'center'; ctx.font = `${baseFont*0.9}px sans-serif`; ctx.fillStyle = '#555';
            ctx.fillText(settings.data.shooting, canvas.width/2, iArea.y + iArea.h/2);
            ctx.textAlign = 'left';
        }
        return canvas;
    }

    function initialize() {
        setupEventListeners();
        document.querySelector('[data-frame-template="template-a"]').click();
        document.querySelector('[data-frame-color="black"]').click();
    }
    initialize();
});
