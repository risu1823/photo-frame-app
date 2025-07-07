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
    let originalImageRatio = 3 / 2; // Default to 3:2

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
                applyAspectRatio(); // Apply the photo's own aspect ratio
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
            } else {
                 inputs.shootingDate.value = null;
            }
            inputs.shutterSpeed.value = exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : '';
            inputs.aperture.value = exif.FNumber ? `f/${exif.FNumber.toFixed(1)}` : '';
            inputs.iso.value = exif.ISOSpeedRatings ? `ISO${exif.ISOSpeedRatings}` : '';
            inputs.focalLength.value = exif.FocalLength ? `${exif.FocalLength}mm` : '';
            inputs.location.value = '';
            updateMetadata();
        });
    }

    function applyAspectRatio(overrideRatio = null) {
        const isCheki = ui.photoFrame.classList.contains('template-c');
        let targetRatio = overrideRatio;

        if (isCheki) {
            targetRatio = 1;
        } else if (!overrideRatio) {
            targetRatio = originalImageRatio;
        }
        
        ui.photoArea.style.aspectRatio = targetRatio;
        
        // Update aspect button states
        ui.aspectButtons.forEach(btn => {
            const btnRatio = eval(btn.dataset.aspect.replace('-', '/'));
            btn.classList.toggle('active', Math.abs(btnRatio - targetRatio) < 0.01);
        });
    }

    function handleTemplateChange(e) {
        const btn = e.currentTarget;
        ui.templateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const template = btn.dataset.frameTemplate;

        // Reset classes and apply new ones
        const currentColor = ui.photoFrame.classList.contains('black-frame') ? 'black-frame' : 'white-frame';
        ui.photoFrame.className = 'photo-frame';
        ui.photoFrame.classList.add(template, currentColor);

        const isCheki = (template === 'template-c');
        ui.aspectButtons.forEach(b => b.classList.toggle('disabled', isCheki));
        
        applyAspectRatio(); // Re-apply aspect ratio based on new template
        updateMetadata();
    }

    function handleAspectChange(e) {
        const btn = e.currentTarget;
        if (btn.classList.contains('disabled')) return;
        const aspect = btn.dataset.aspect.replace('-', '/');
        applyAspectRatio(eval(aspect));
    }

    function handleColorChange(e) {
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
                const canvas = await html2canvas(ui.photoFrame, { useCORS: true, scale: 2, backgroundColor: null });
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

        if (settings.template === 'template-c') {
            infoH = targetWidth * 0.4; // Cheki has a larger bottom margin
        }
        canvas.height += infoH;

        const img = await (new Promise(r => { const i = new Image(); i.crossOrigin="anonymous"; i.onload=()=>r(i); i.src=originalImageSrc; }));
        ctx.fillStyle = settings.isBlack ? '#111' : '#fff'; // Frame color for background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const pArea = { x: 0, y: 0, w: targetWidth, h: photoH };
        if (settings.template === 'template-c') { // Cheki has inset photo
             pArea.w = targetWidth * 0.9; pArea.h = pArea.w / settings.aspectRatio;
             pArea.x = (targetWidth - pArea.w) / 2; pArea.y = pArea.x;
             infoH = canvas.height - (pArea.y + pArea.h);
        }
        
        // Draw Image
        ctx.fillStyle = '#000'; ctx.fillRect(pArea.x, pArea.y, pArea.w, pArea.h);
        const imgR = img.width / img.height; const areaR = pArea.w / pArea.h;
        let dw, dh, dx, dy;
        if (imgR > areaR) { dw=pArea.w; dh=dw/imgR; dx=pArea.x; dy=pArea.y+(pArea.h-dh)/2; }
        else { dh=pArea.h; dw=dh*imgR; dx=pArea.x+(pArea.w-dw)/2; dy=pArea.y; }
        ctx.drawImage(img, dx, dy, dw, dh);
        
        // Draw Info
        const iArea = { x: 0, y: pArea.y + pArea.h, w: canvas.width, h: infoH, p: targetWidth*0.04 };
        ctx.fillStyle = settings.isBlack ? '#fff' : '#333';
        const baseFont = targetWidth * 0.025;
        
        if (settings.template === 'template-a') {
            ctx.font = `bold ${baseFont*1.1}px sans-serif`; ctx.fillText(settings.data.camera, iArea.p, iArea.y + iArea.p*1.5);
            ctx.font = `${baseFont*0.9}px sans-serif`; ctx.fillText(settings.data.shooting, iArea.p, iArea.y + iArea.p*2.5);
            ctx.textAlign = 'right'; ctx.fillStyle = settings.isBlack ? '#ccc' : '#888';
            if (settings.data.date) { ctx.fillText(settings.data.date.toLocaleDateString('ja-JP'), iArea.w-iArea.p, iArea.y + iArea.p*2.5); }
            ctx.textAlign = 'left';
            ctx.font = `italic ${baseFont*0.8}px sans-serif`; ctx.fillStyle = settings.isBlack ? '#ccc' : '#888';
            ctx.fillText(settings.data.location, iArea.p, iArea.y + iArea.p*3.5);
        } else if (settings.template === 'template-b') {
            ctx.textAlign = 'right';
            ctx.font = `bold ${baseFont*1.1}px sans-serif`; ctx.fillText(settings.data.camera, iArea.w-iArea.p, iArea.y + iArea.h/2 - baseFont*0.6);
            ctx.font = `${baseFont*0.9}px sans-serif`; ctx.fillStyle = settings.isBlack ? '#eee' : '#666'; ctx.fillText(settings.data.shooting, iArea.w-iArea.p, iArea.y + iArea.h/2 + baseFont*0.8);
            ctx.textAlign = 'left';
        } else if (settings.template === 'template-c') {
            ctx.textAlign = 'center'; ctx.font = `${baseFont*0.9}px sans-serif`; ctx.fillStyle = settings.isBlack ? '#eee' : '#555';
            ctx.fillText(settings.data.shooting, canvas.width/2, iArea.y + iArea.h/2);
            ctx.textAlign = 'left';
        }
        return canvas;
    }

    function initialize() {
        setupEventListeners();
        document.querySelector('[data-frame-template="template-a"]').click();
        document.querySelector('[data-frame-color="black"]').click();
        applyAspectRatio();
    }
    initialize();
});
