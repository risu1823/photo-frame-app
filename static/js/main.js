// DOM要素の取得
const photoFrame = document.getElementById('photoFrame');
const photoImg = document.getElementById('photoImg');
const placeholder = document.getElementById('placeholder');
const uploadArea = document.getElementById('uploadArea');
const photoInput = document.getElementById('photoInput');

const templateButtons = document.querySelectorAll('#templateButtonGroup .btn'); // New: Template buttons
const aspectButtons = document.querySelectorAll('#aspectButtonGroup .btn');
const alignButtons = document.querySelectorAll('#alignButtonGroup .btn');
const colorControlItem = document.getElementById('colorControlItem'); // New: Color control item parent
const colorButtons = document.querySelectorAll('#colorButtonGroup .btn'); // New: Color buttons
const downloadBtn = document.getElementById('downloadBtn');

// 入力要素
const cameraInfoInput = document.getElementById('cameraInfo');
const shootingDateInput = document.getElementById('shootingDate');
const locationInput = document.getElementById('location');
const shutterSpeedInput = document.getElementById('shutterSpeed');
const apertureInput = document.getElementById('aperture');
const isoInput = document.getElementById('iso');
const focalLengthInput = document.getElementById('focalLength');

// 表示要素 (各テンプレート用)
// Leica風
const displayLeicaCameraLens = document.getElementById('displayLeicaCameraLens');
const displayLeicaTime = document.getElementById('displayLeicaTime');
const displayLeicaDate = document.getElementById('displayLeicaDate');
const displayLeicaFocal = document.getElementById('displayLeicaFocal');
const displayLeicaAperture = document.getElementById('displayLeicaAperture');
const displayLeicaShutter = document.getElementById('displayLeicaShutter');
const displayLeicaISO = document.getElementById('displayLeicaISO');
const displayLeicaLocation = document.getElementById('displayLeicaLocation');

// Fujifilm風
const displayFujifilmCamera = document.getElementById('displayFujifilmCamera');
const displayFujifilmShooting = document.getElementById('displayFujifilmShooting');


// ファイルアップロード処理
uploadArea.addEventListener('click', () => photoInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

photoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            photoImg.src = e.target.result;
            photoImg.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);

        // EXIF情報の読み込み
        EXIF.getData(file, function () {
            const exif = EXIF.getAllTags(this);

            // EXIF情報を入力フォームに自動入力
            const make = exif.Make || '';
            const model = exif.Model || '';
            const lensModel = exif.LensModel || '';
            cameraInfoInput.value = `${make} ${model} ${lensModel}`.trim();

            if (exif.DateTimeOriginal) {
                const dt = exif.DateTimeOriginal.split(' ')[0].replace(/:/g, '-') + 'T' + exif.DateTimeOriginal.split(' ')[1];
                shootingDateInput.value = dt;
            } else {
                shootingDateInput.value = '';
            }

            shutterSpeedInput.value = exif.ExposureTime ? `1/${Math.round(1 / exif.ExposureTime)}s` : '';
            apertureInput.value = exif.FNumber ? `f/${exif.FNumber}` : '';
            isoInput.value = exif.ISOSpeedRatings ? `ISO${exif.ISOSpeedRatings}` : '';
            focalLengthInput.value = exif.FocalLength ? `${exif.FocalLength}mm` : '';
            locationInput.value = exif.GPSLatitude && exif.GPSLongitude ? '位置情報あり' : ''; // EXIFからは直接場所名取れないので仮に

            // 入力フォームの値が更新されたら、表示も更新
            updateMetadata();
        });
    }
}

// フレームテンプレートの切り替え (New)
templateButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        templateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const template = btn.dataset.frameTemplate;
        photoFrame.classList.remove('leica-template', 'fujifilm-template', 'cheki-template'); // Remove all template classes
        photoFrame.classList.add(`${template}-template`);

        // Leica風の場合はアスペクト比ボタンを活性化、チェキの場合は無効化し固定
        if (template === 'cheki') {
            aspectButtons.forEach(b => b.classList.remove('active', 'disabled'));
            const chekiAspectButton = document.querySelector('[data-aspect="3-2"]'); // チェキは正方形だが、便宜上3:2に紐付け
            if (chekiAspectButton) {
                chekiAspectButton.classList.add('active');
                chekiAspectButton.click(); // アスペクト比を適用
            }
            aspectButtons.forEach(b => b.classList.add('disabled')); // 全て無効化

            // フレーム色ボタンを無効化し、「白」を強制アクティブにする
            colorControlItem.classList.add('disabled');
            colorButtons.forEach(b => b.classList.remove('active', 'disabled'));
            const whiteButton = document.querySelector('[data-frame-color="white"]');
            if (whiteButton) {
                whiteButton.classList.add('active');
            }
            photoFrame.classList.remove('black-frame');
            photoFrame.classList.add('white-frame');

        } else if (template === 'fujifilm') {
            // Fujifilmの場合はアスペクト比ボタンは活性化されたまま、色は強制的に白
            aspectButtons.forEach(b => b.classList.remove('disabled'));
            colorControlItem.classList.add('disabled');
            colorButtons.forEach(b => b.classList.remove('active', 'disabled'));
            const whiteButton = document.querySelector('[data-frame-color="white"]');
            if (whiteButton) {
                whiteButton.classList.add('active');
            }
            photoFrame.classList.remove('black-frame');
            photoFrame.classList.add('white-frame');
            
        } else { // Leica
            // Leica風の場合はアスペクト比ボタンを活性化、色ボタンも活性化
            aspectButtons.forEach(b => b.classList.remove('disabled'));
            colorControlItem.classList.remove('disabled');
            colorButtons.forEach(b => b.classList.remove('disabled'));
            // 現在アクティブな色を維持、またはデフォルトに戻す
            const currentActiveColorButton = document.querySelector('#colorButtonGroup .btn.active');
            if (!currentActiveColorButton) {
                document.querySelector('[data-frame-color="black"]').click(); // 黒をデフォルトに
            }
        }
        updateMetadata(); // テンプレート切り替え時にもメタデータを更新
    });
});

// アスペクト比の変更
aspectButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return; // 無効化されている場合は何もしない

        aspectButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const aspect = btn.dataset.aspect;
        // photoFrame.className = photoFrame.className.replace(/aspect-\S+/g, ''); // テンプレートクラスも消えるので注意
        photoFrame.classList.forEach(cls => {
            if (cls.startsWith('aspect-')) {
                photoFrame.classList.remove(cls);
            }
        });
        photoFrame.classList.add(`aspect-${aspect}`);
    });
});

// アライメントの変更
alignButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        alignButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const align = btn.dataset.align;
        // photoFrame.className = photoFrame.className.replace(/align-\S+/g, ''); // テンプレートクラスも消えるので注意
        photoFrame.classList.forEach(cls => {
            if (cls.startsWith('align-')) {
                photoFrame.classList.remove(cls);
            }
        });
        photoFrame.classList.add(`align-${align}`);
    });
});

// フレーム色の変更
colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled') || colorControlItem.classList.contains('disabled')) return; // 無効化されている場合は何もしない

        // 現在のテンプレートがLeica風以外の場合は色変更不可
        if (!photoFrame.classList.contains('leica-template')) {
             // ユーザーにアラートを出すか、ボタンを完全に無効化するかは要件次第
             return; // 何もしない
        }

        colorButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const color = btn.dataset.frameColor;
        photoFrame.classList.remove('black-frame', 'white-frame');
        photoFrame.classList.add(`${color}-frame`);
    });
});

// メタデータの更新
function updateMetadata() {
    const currentTemplate = document.querySelector('#templateButtonGroup .btn.active').dataset.frameTemplate;

    // 全ての表示要素を初期化（非表示のパネルの要素もクリアするため）
    [displayLeicaCameraLens, displayLeicaTime, displayLeicaDate, displayLeicaFocal,
     displayLeicaAperture, displayLeicaShutter, displayLeicaISO, displayLeicaLocation,
     displayFujifilmCamera, displayFujifilmShooting].forEach(el => el.textContent = '');

    // 入力フォームの値を取得
    const cameraText = cameraInfoInput.value || 'カメラ機種 + レンズ';
    const shootingDateTime = shootingDateInput.value ? new Date(shootingDateInput.value) : null;
    const shutterText = shutterSpeedInput.value || '1/125';
    const apertureText = apertureInput.value || 'f/2.8';
    const isoText = isoInput.value || 'ISO 800';
    const focalText = focalLengthInput.value || '85mm';
    const locationText = locationInput.value || '撮影場所';

    if (currentTemplate === 'leica' || currentTemplate === 'cheki') {
        // Leica風 / チェキ風の表示ロジック
        displayLeicaCameraLens.textContent = cameraText;
        displayLeicaFocal.textContent = focalText;
        displayLeicaAperture.textContent = apertureText;
        displayLeicaShutter.textContent = shutterText;
        displayLeicaISO.textContent = isoText;
        displayLeicaLocation.textContent = locationText;

        if (shootingDateTime) {
            displayLeicaDate.textContent = shootingDateTime.toLocaleDateString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).replace(/\//g, '.'); // YYYY.MM.DD形式に
            displayLeicaTime.textContent = shootingDateTime.toLocaleTimeString('ja-JP', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } else {
            displayLeicaDate.textContent = '2023.01.01';
            displayLeicaTime.textContent = '00:00:00';
        }
    } else if (currentTemplate === 'fujifilm') {
        // Fujifilm風の表示ロジック
        // 例: "LEICA Q2" -> "Shot on Q2 LEICA" のように変換
        // "X-E4 FUJIFILM" -> "Shot on X-E4 FUJIFILM"
        let cameraDisplay = cameraText.trim();
        if (cameraDisplay) {
            const parts = cameraDisplay.split(' ');
            if (parts.length >= 2) {
                const make = parts[parts.length - 1]; // 最後の単語をメーカー名として試行
                const model = parts.slice(0, -1).join(' '); // それ以外をモデル名として試行
                displayFujifilmCamera.textContent = `Shot on ${model} ${make}`;
            } else {
                displayFujifilmCamera.textContent = `Shot on ${cameraDisplay}`;
            }
        } else {
            displayFujifilmCamera.textContent = 'Shot on UNKNOWN CAMERA';
        }
       
        displayFujifilmShooting.textContent = `${focalText} ${apertureText} ${shutterText} ${isoText}`.trim();
    }
}

// 画像として保存 (ダウンロード)
downloadBtn.addEventListener('click', () => {
    // ダウンロードする要素全体を指定
    html2canvas(document.getElementById('photoFrame'), {
        useCORS: true,
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'photo_frame.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    });
});


// イベントリスナーの設定: 入力要素が変更されたらメタデータを更新
[cameraInfoInput, shootingDateInput, locationInput, shutterSpeedInput, apertureInput, isoInput, focalLengthInput].forEach(input => {
    input.addEventListener('input', updateMetadata);
});

// 初期化: ページロード時にメタデータ表示とボタンの状態を更新
document.addEventListener('DOMContentLoaded', () => {
    // 初期テンプレートボタンのアクティブ化
    const initialTemplateButton = document.querySelector('[data-frame-template="leica"]');
    if (initialTemplateButton) {
        initialTemplateButton.classList.add('active');
        initialTemplateButton.click(); // クリックイベントを発火させて初期状態をセット
    }
    // 初期アスペクト比ボタンのアクティブ化 (HTMLでactiveがついていれば不要だが念のため)
    const initialAspectButton = document.querySelector('[data-aspect="3-2"]');
    if (initialAspectButton) {
        initialAspectButton.classList.add('active');
    }
    // 初期色ボタンのアクティブ化 (HTMLでactiveがついていれば不要だが念のため)
    const initialColorButton = document.querySelector('[data-frame-color="black"]');
    if (initialColorButton) {
        initialColorButton.classList.add('active');
    }
    
    updateMetadata(); // 初期表示のメタデータをセット
});
